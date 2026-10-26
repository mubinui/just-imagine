import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import {
  BuilderJobSchema,
  WorldDocSchema,
  WorldVersionDocSchema,
  UserDocSchema,
  ChildDocSchema,
  AssetCacheDocSchema,
  PLAN_LIMITS,
  paths,
  type BuilderJob,
  type WorldDoc,
} from '@just-imagine/protocol';
import {
  db,
  isKillSwitchOn,
  addImages,
  logEvent,
  traced,
  transaction,
} from '@just-imagine/server-core';
import { buildScene, patchScene, STYLE_BIBLE } from './pipeline';
import { assetKey, processSprite, processMotionAtlas, MotionRegistrationError } from './assets';
import type { VertexModels } from './vertex';
import {
  GameGenerationError,
  guardPatchedGame,
  imagineGame,
  type ImagineGameDeps,
} from './imagine-game';
import { initialCreation, reviseCreation } from './revisions';
import { applyPaintedFloor } from './presentation';
import { layerArtPrompt, processLayerArt } from './layer-art';
import {
  motionArt,
  sameMotionArt,
  locomotionImagePrompt,
  dropMissingMotion,
  motionRepairInstruction,
  hasMotionArtwork,
} from './motion';
import {
  applyArt,
  requestsFor,
  startArt,
  type ArtAsset,
  type ArtOutcome,
  type ArtRequest,
} from './art-phase';
import { ART_PHASE_MS, createBudget } from './budget';
import type { PatchOp, AssetRef, SceneDoc } from '@just-imagine/scene-schema';

export class BuilderWorker {
  private storage = new Storage();
  constructor(
    private models: VertexModels,
    private config: { bucket: string; assetBaseUrl: string; assetDirectory?: string },
    /** Generated games: when present, build jobs run the `imagineGame` flow. */
    private game?: Omit<ImagineGameDeps, 'generateScene'>,
  ) {}
  async run(input: unknown): Promise<{ status: 'complete' | 'already-complete' }> {
    const job = BuilderJobSchema.parse(input);
    try {
      return await this.runJob(job);
    } catch (error) {
      await transaction(async (tx) => {
        const ref = db().doc(`builderJobs/${job.jobId}`),
          prior = await tx.get(ref);
        const fences = await Promise.all([
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
          tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
          tx.get(db().doc(paths.user(job.uid))),
          tx.get(db().doc(paths.child(job.uid, job.childId))),
        ]);
        if (
          fences.slice(0, 3).some((snapshot) => snapshot.exists) ||
          fences.slice(3).some((snapshot) => !snapshot.exists)
        )
          return;
        if (['running', 'complete', 'fallback'].includes(prior.data()?.['status'])) return;
        tx.set(
          ref,
          {
            status: 'failed',
            uid: job.uid,
            childId: job.childId,
            worldId: job.worldId,
            finishedAt: Date.now(),
          },
          { merge: true },
        );
      });
      throw error;
    }
  }
  private async runJob(input: unknown): Promise<{ status: 'complete' | 'already-complete' }> {
    const job = BuilderJobSchema.parse(input);
    if (await isKillSwitchOn()) throw new Error('Generation is temporarily paused');
    const lease = randomUUID(),
      jobRef = db().doc(`builderJobs/${job.jobId}`),
      lockRef = db().doc(`worldLocks/${job.worldId}`);
    const claim = await transaction(async (tx) => {
      const [prior, lock, userSnap, childSnap, userDeletion, childDeletion, worldDeletion] =
        await Promise.all([
          tx.get(jobRef),
          tx.get(lockRef),
          tx.get(db().doc(paths.user(job.uid))),
          tx.get(db().doc(paths.child(job.uid, job.childId))),
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
          tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
        ]);
      if (['complete', 'fallback'].includes(prior.data()?.['status'])) return false;
      if (
        worldDeletion.exists ||
        userDeletion.exists ||
        childDeletion.exists ||
        !userSnap.exists ||
        !childSnap.exists
      )
        throw new Error('Parent or child is unavailable');
      const user = UserDocSchema.parse(userSnap.data()),
        child = ChildDocSchema.parse(childSnap.data());
      if (job.kind === 'build') {
        job.ageBand = child.ageBand;
        if (job.tier === 'lab' && child.ageBand === '6-7' && !child.labsUnlocked)
          throw new Error('Labs are locked');
      }
      job.plan = user.plan;
      if ((lock.data()?.['expiresAt'] ?? 0) > Date.now())
        throw new Error('Another job is updating this world');
      if (job.kind === 'build') {
        const worlds = await tx.get(db().collection('worlds').where('ownerUid', '==', job.uid));
        const pending = await tx.get(
          db()
            .collection('builderJobs')
            .where('uid', '==', job.uid)
            .where('status', '==', 'running'),
        );
        const reserved = new Set([
          ...worlds.docs.map((w) => w.id),
          ...pending.docs.map((j) => j.data()['worldId'] as string),
        ]);
        if (reserved.size >= PLAN_LIMITS[user.plan].savedWorlds && !reserved.has(job.worldId))
          throw new Error('Saved world limit reached');
        tx.set(db().doc(paths.user(job.uid)), user);
      }
      tx.set(jobRef, {
        status: 'running',
        uid: job.uid,
        childId: job.childId,
        worldId: job.worldId,
        lease,
        startedAt: Date.now(),
      });
      // The hard build budget plus room for the completion writes.
      tx.set(lockRef, { lease, expiresAt: Date.now() + 960000 });
      return true;
    });
    if (!claim) return { status: 'already-complete' };
    const budget = createBudget();
    /** Set once the build stops listening to art: the world is final, or the build failed. */
    let closed = false;
    try {
      if (job.kind === 'patch' || job.kind === 'undo') {
        if (job.kind === 'undo') await this.undo(job, lease);
        else await this.patch(job, lease);
        logEvent('builder_result', { jobId: job.jobId, success: true });
        return { status: 'complete' };
      } else {
        let art: ReturnType<typeof startArt> | undefined;
        let requests: ArtRequest[] = [];
        /** Set once `base`, the world as built, exists; nothing is published before then. */
        let publishable = false;
        let publishing: Promise<void> = Promise.resolve();
        let queued = false;
        let publishFailed = false;
        // Publishes run one at a time, each painting every outcome known when it starts.
        const publishArt = () => {
          if (queued) return publishing;
          queued = true;
          publishing = publishing.then(() => {
            queued = false;
            return this.publish(job, lease, applyArt(base, art!.outcomes));
          });
          publishing.catch(() => (publishFailed = true));
          return publishing;
        };
        // Art depends only on the job and the scene, so it starts as soon as the scene exists.
        const beginArt = (scene: SceneDoc) => {
          if (art) return;
          requests = requestsFor(scene, job.plan);
          art = startArt(
            requests,
            async (request) => {
              try {
                return await this.asset(job, request);
              } catch (error) {
                logEvent(
                  'asset_failed',
                  { jobId: job.jobId, milestone: request.kind, success: false },
                  'WARNING',
                );
                throw error;
              }
            },
            {
              deadline: budget.deadlineFor(ART_PHASE_MS),
              onUpdate: () => {
                if (publishable && !closed) void publishArt();
              },
              stop: async () => closed || publishFailed || (await isKillSwitchOn()),
            },
          );
        };
        const doc = await traced(
          'scene_build',
          { worldId: job.worldId, jobId: job.jobId },
          async () => {
            if (!this.game) return buildScene(job, this.models.generate);
            const built = await imagineGame(job, {
              ...this.game,
              generateScene: this.models.generate,
              reviewScene: this.models.reviewScene,
              budget,
              onScene: beginArt,
            });
            logEvent(
              built.fallback ? 'game_fallback' : 'game_kind',
              {
                jobId: job.jobId,
                worldId: job.worldId,
                milestone: built.kind,
                count: built.attempts,
                success: !built.fallback,
              },
              built.fallback ? 'WARNING' : 'INFO',
            );
            return built.doc;
          },
        );
        beginArt(doc);
        // The world as built, before any art; every publish paints the outcomes onto it.
        const base: WorldDoc = WorldDocSchema.parse({
          ownerUid: job.uid,
          childId: job.childId,
          title: doc.title,
          status: 'building',
          doc,
          schemaVersion: 1,
          promptVersion: job.promptVersion,
          styleVersion: job.styleVersion,
          assets: {},
          concepts: doc.learning.concepts,
          thumbnailUrl: null,
          jobId: job.jobId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          creation: initialCreation(job),
        });
        publishable = true;
        // The first publish already carries any art that finished while the game was written.
        await publishArt();
        let timer: NodeJS.Timeout | undefined;
        const deadlineHit = await Promise.race([
          art!.done.then(() => false),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(true), Math.max(0, budget.hard - Date.now()));
          }),
        ]);
        clearTimeout(timer);
        closed = true;
        await publishing;
        const outcomes = new Map<string, ArtOutcome>(art!.outcomes);
        if (deadlineHit) {
          logEvent(
            'build_deadline_hit',
            { jobId: job.jobId, worldId: job.worldId, phase: 'art' },
            'WARNING',
          );
          for (const request of requests)
            if (outcomes.get(request.id)?.status !== 'ready')
              outcomes.set(request.id, { status: 'failed' });
        }
        const world = applyArt(base, outcomes);
        // A sprite whose motion art did not finish stands still; the world is never failed for it.
        const dropped = dropMissingMotion(world.doc);
        if (dropped.length)
          logEvent(
            'art_locomotion_dropped',
            { jobId: job.jobId, worldId: job.worldId, ids: dropped },
            'WARNING',
          );
        await this.publish(job, lease, { ...world, status: 'ready' });
      }
      await transaction(async (tx) => {
        const [lock, ...fences] = await Promise.all([
          tx.get(lockRef),
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
          tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
        ]);
        if (fences.some((snapshot) => snapshot.exists)) throw new Error('Deletion requested');
        if (lock.data()?.['lease'] !== lease) throw new Error('Job lease lost');
        tx.update(jobRef, {
          status: 'complete',
          finishedAt: Date.now(),
        });
        tx.delete(lockRef);
      });
      logEvent('builder_result', {
        jobId: job.jobId,
        success: true,
      });
      return { status: 'complete' };
    } catch (error) {
      closed = true;
      if (error instanceof GameGenerationError)
        logEvent(
          'game_generation_failed',
          {
            jobId: job.jobId,
            worldId: job.worldId,
            milestone: error.diagnostic.code,
            ...(error.diagnostic.attempt !== undefined ? { count: error.diagnostic.attempt } : {}),
          },
          'ERROR',
        );
      logEvent(
        'builder_result',
        { jobId: job.jobId, worldId: job.worldId, success: false },
        'ERROR',
      );
      await transaction(async (tx) => {
        const [lock, world, parentDelete, childDelete, worldDelete] = await Promise.all([
          tx.get(lockRef),
          tx.get(db().doc(paths.world(job.worldId))),
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
          tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
        ]);
        if (lock.data()?.['lease'] !== lease) return;
        if (!parentDelete.exists && !childDelete.exists && !worldDelete.exists)
          tx.update(jobRef, {
            status: 'failed',
            finishedAt: Date.now(),
            ...(error instanceof GameGenerationError ? { failure: error.diagnostic } : {}),
          });
        if (
          job.kind === 'build' &&
          world.exists &&
          !parentDelete.exists &&
          !childDelete.exists &&
          !worldDelete.exists
        )
          tx.update(world.ref, { status: 'failed', updatedAt: Date.now() });
        tx.delete(lockRef);
      });
      throw error;
    }
  }
  private async publish(job: BuilderJob, lease: string, world: WorldDoc) {
    await transaction(async (tx) => {
      const [lock, userDelete, childDelete, worldDelete] = await Promise.all([
        tx.get(db().doc(`worldLocks/${job.worldId}`)),
        tx.get(db().doc(`deletionLocks/${job.uid}`)),
        tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
        tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
      ]);
      if (
        lock.data()?.['lease'] !== lease ||
        worldDelete.exists ||
        userDelete.exists ||
        childDelete.exists
      )
        throw new Error('World is no longer writable');
      tx.set(
        db().doc(paths.world(job.worldId)),
        WorldDocSchema.parse({ ...world, updatedAt: Date.now() }),
      );
    });
    logEvent('world_milestone', {
      worldId: job.worldId,
      jobId: job.jobId,
      milestone: world.status,
      durationMs: Date.now() - world.createdAt,
    });
  }
  private async patch(job: Extract<BuilderJob, { kind: 'patch' }>, lease: string) {
    const ref = db().doc(paths.world(job.worldId));
    const snap = await ref.get();
    const world = WorldDocSchema.parse(snap.data());
    if (world.ownerUid !== job.uid || world.childId !== job.childId)
      throw new Error('World owner mismatch');
    const child = ChildDocSchema.parse(
      (await db().doc(paths.child(job.uid, job.childId)).get()).data(),
    );
    let next: WorldDoc;
    let patch: PatchOp[] | null = null;
    if (this.game && world.doc.tier !== 'lab') {
      const revised = await reviseCreation(world, job, child, {
        ...this.game,
        generateScene: this.models.generate,
        reviewScene: this.models.reviewScene,
      });
      next = { ...world, ...revised };
      await this.paintEdit(job, next, world);
    } else {
      const patched = await patchScene(
        world.doc,
        job.childRequest ?? job.instruction,
        this.models.generate,
      );
      patched.doc = await guardPatchedGame(world.doc, patched.doc, {
        language: child.language ?? 'en',
        ...(this.game?.moderate ? { moderate: this.game.moderate } : {}),
      });
      next = { ...world, doc: patched.doc };
      patch = patched.patch;
    }
    const dropped = dropMissingMotion(next.doc);
    if (dropped.length)
      logEvent(
        'art_locomotion_dropped',
        { jobId: job.jobId, worldId: job.worldId, ids: dropped },
        'WARNING',
      );
    applyPaintedFloor(next.doc);
    await this.commitRevision(job, lease, world, next, job.childRequest ?? job.instruction, patch);
  }
  private async undo(job: Extract<BuilderJob, { kind: 'undo' }>, lease: string) {
    const world = WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
    if (world.ownerUid !== job.uid || world.childId !== job.childId)
      throw new Error('World owner mismatch');
    if (!world.revisionId) throw new EditError('There is no previous edit to undo.');
    const revision = WorldVersionDocSchema.parse(
      (
        await db()
          .doc(`${paths.worldVersions(job.worldId)}/${world.revisionId}`)
          .get()
      ).data(),
    );
    const previous = revision.previousWorld;
    if (
      !previous ||
      previous.ownerUid !== job.uid ||
      previous.childId !== job.childId ||
      previous.doc.worldId !== job.worldId
    )
      throw new EditError('The previous creation is unavailable.');
    await this.commitRevision(job, lease, world, previous, 'Undo last edit', null);
  }
  private async paintEdit(job: BuilderJob, world: WorldDoc, before: WorldDoc) {
    const doc = world.doc;
    const requests = [
      ...(doc.theme.backdropDescription !== before.doc.theme.backdropDescription
        ? [
            {
              id: 'backdrop',
              description: doc.theme.backdropDescription,
              kind: 'backdrop',
              hero: true,
            },
          ]
        : []),
      ...(doc.theme.midLayerDescription &&
      doc.theme.midLayerDescription !== before.doc.theme.midLayerDescription
        ? [
            {
              id: 'midLayer',
              description: doc.theme.midLayerDescription,
              kind: 'overlay',
              hero: true,
            },
          ]
        : []),
      ...doc.entities
        .filter(
          (e) =>
            e.kind === 'sprite' &&
            !before.doc.entities.some(
              (old) =>
                old.id === e.id &&
                old.kind === e.kind &&
                old.description === e.description &&
                old.asset?.status === 'ready' &&
                hasMotionArtwork(old) &&
                sameMotionArt(old.locomotion, e.locomotion),
            ),
        )
        .sort((a, b) => Number(Boolean(b.character)) - Number(Boolean(a.character)))
        .slice(0, PLAN_LIMITS[job.plan].imagesPerWorld)
        .map((e) => ({
          id: e.id,
          description: e.description,
          kind: 'sprite',
          hero: Boolean(e.character) || e.id === doc.learning.heroEntityId,
          ...(e.locomotion ? { locomotion: e.locomotion } : {}),
        })),
    ];
    world.assets = {};
    const existingAssets: [string, AssetRef | undefined][] = [
      ['backdrop', doc.theme.backdrop],
      ['midLayer', doc.theme.midLayer],
      ...doc.entities.map((e) => [e.id, e.asset]),
    ] as [string, AssetRef | undefined][];
    for (const [id, asset] of existingAssets) {
      if (asset)
        world.assets[id] = {
          status: asset.status,
          url: asset.url,
          ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
        };
    }
    world.thumbnailUrl = doc.theme.backdrop.status === 'ready' ? doc.theme.backdrop.url : null;
    let cursor = 0;
    const deadline = Date.now() + 180000;
    const work = async () => {
      while (cursor < requests.length) {
        const request = requests[cursor++]!;
        if (Date.now() > deadline || (await isKillSwitchOn()))
          throw new EditError('Artwork did not finish; the previous creation was kept.');
        let asset: ArtAsset;
        try {
          asset = await this.asset(job, request);
        } catch (error) {
          // A failed animation sheet never rejects the edit: the sprite keeps its old still
          // picture, if it had one, and `patch` drops its locomotion.
          if (!request.locomotion || request.locomotion.kind === 'roll') throw error;
          logEvent(
            'asset_failed',
            { jobId: job.jobId, milestone: request.kind, success: false },
            'WARNING',
          );
          const old = before.doc.entities.find((e) => e.id === request.id);
          const entity = doc.entities.find((e) => e.id === request.id);
          if (
            entity &&
            old?.asset?.status === 'ready' &&
            !old.asset.animation &&
            old.kind === entity.kind &&
            old.description === entity.description
          ) {
            entity.asset = structuredClone(old.asset);
            world.assets[request.id] = {
              status: 'ready',
              url: old.asset.url,
              ...(old.asset.colliderUrl ? { colliderUrl: old.asset.colliderUrl } : {}),
            };
          } else world.assets[request.id] = { status: 'failed' };
          continue;
        }
        const ref = {
          status: 'ready' as const,
          url: asset.url,
          width: asset.width,
          height: asset.height,
          ...(asset.animation ? { animation: asset.animation } : {}),
          ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
        };
        world.assets[request.id] = {
          status: 'ready',
          url: asset.url,
          ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
        };
        if (request.id === 'backdrop') {
          doc.theme.backdrop = ref;
          world.thumbnailUrl = ref.url;
        } else if (request.id === 'midLayer') doc.theme.midLayer = ref;
        else {
          const entity = doc.entities.find((e) => e.id === request.id);
          if (entity) entity.asset = ref;
        }
      }
    };
    const results = await Promise.allSettled(
      Array.from({ length: Math.min(4, requests.length) }, work),
    );
    if (results.some((result) => result.status === 'rejected'))
      throw new EditError(
        'The requested artwork could not be finished; the previous creation was kept.',
      );
  }
  private async commitRevision(
    job: Extract<BuilderJob, { kind: 'patch' | 'undo' }>,
    lease: string,
    world: WorldDoc,
    next: WorldDoc,
    reason: string,
    patch: PatchOp[] | null,
  ) {
    const ref = db().doc(paths.world(job.worldId));
    await transaction(async (tx) => {
      const lockRef = db().doc(`worldLocks/${job.worldId}`);
      const [lock, parentDelete, childDelete, worldDelete, current] = await Promise.all([
        tx.get(lockRef),
        tx.get(db().doc(`deletionLocks/${job.uid}`)),
        tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
        tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
        tx.get(ref),
      ]);
      if (
        lock.data()?.['lease'] !== lease ||
        parentDelete.exists ||
        childDelete.exists ||
        worldDelete.exists ||
        !current.exists ||
        current.data()?.['updatedAt'] !== world.updatedAt
      )
        throw new Error('World no longer writable');
      tx.set(
        ref,
        WorldDocSchema.parse({
          ...next,
          status: 'ready',
          title: next.doc.title,
          concepts: next.doc.learning.concepts,
          ...(job.kind === 'patch' ? { revisionId: job.jobId } : {}),
          jobId: job.jobId,
          updatedAt: Date.now(),
        }),
      );
      tx.set(db().collection(paths.worldVersions(job.worldId)).doc(job.jobId), {
        doc: next.doc,
        previousWorld: world,
        patch,
        reason,
        createdAt: Date.now(),
      });
      tx.update(db().doc(`builderJobs/${job.jobId}`), {
        status: 'complete',
        finishedAt: Date.now(),
      });
      tx.delete(lockRef);
    });
  }
  private async asset(job: BuilderJob, request: ArtRequest): Promise<ArtAsset> {
    const style = job.kind === 'build' ? job.styleVersion : 'v1';
    const hash = assetKey(
      request.description,
      request.kind,
      request.kind === 'sprite'
        ? request.locomotion
          ? `${style}:${request.locomotion.kind === 'roll' ? 'motion-v2' : 'motion-v5'}:${JSON.stringify(motionArt(request.locomotion))}`
          : `${style}:cutout-v2`
        : request.kind === 'overlay'
          ? `${style}:overlay-v1`
          : style,
    );
    const cached = AssetCacheDocSchema.safeParse(
      (await db().doc(paths.assetCache(hash)).get()).data(),
    );
    logEvent('asset_cache', {
      jobId: job.jobId,
      cached: cached.success && cached.data.safetyChecked,
    });
    if (cached.success && cached.data.safetyChecked) return cached.data;
    let repair = '',
      reference: Buffer | undefined;
    let chroma: 'magenta' | 'green' = 'magenta';
    const motion = request.kind === 'sprite' ? request.locomotion : undefined;
    const animated = motion && motion.kind !== 'roll';
    const overlay = request.kind === 'overlay';
    for (let attempt = 0; attempt < 2; attempt++) {
      let raw: Buffer | undefined;
      let stage: 'REQUEST' | 'REGISTRATION' | 'REVIEW' | 'STORAGE' = 'REQUEST';
      try {
        const styleBible =
          request.kind === 'sprite'
            ? STYLE_BIBLE.replace('soft rim light', 'clean edges')
            : STYLE_BIBLE;
        const background = chroma === 'green' ? 'green #00FF00' : 'magenta #FF00FF';
        const motionPrompt =
          motion?.kind === 'roll' && motion.wheels
            ? ' Render vehicle chassis WITHOUT wheels; rotating geometric wheels will be mounted by the engine. Leave the specified lower wheel areas clear. Side view.'
            : '';
        const prompt = animated
          ? locomotionImagePrompt(request.description, motion, background) +
            (repair ? ` ${repair}` : '')
          : overlay
            ? `${styleBible} ${layerArtPrompt(request.description, background)}`
            : `${styleBible} ${request.description}.${motionPrompt} ${request.kind === 'sprite' ? `Full body, centered, flat pure ${background} background. Render the character as an opaque painted cartoon: use internal highlights for jelly, glass or light, never let the chroma background show through the body. Crisp clean silhouette, no outer glow, no floating particles, no background shadow, no text. The flat background color is only outside the silhouette.` : 'Wide 16:9 landscape, no text, no foreground characters.'}${attempt ? ' This is a cutout retry: preserve the requested character and its colors, with fully opaque clean edges against the replacement background.' : ''}`;
        raw = await this.models.image(
          prompt,
          Boolean(animated) || request.hero || attempt > 0,
          request.kind !== 'sprite',
          Boolean(animated),
          animated ? { imageSize: '2K', ...(reference ? { reference } : {}) } : undefined,
        );
        stage = 'REGISTRATION';
        const layer = overlay ? await processLayerArt(raw, chroma) : null;
        const processed =
          request.kind === 'sprite'
            ? animated
              ? await processMotionAtlas(raw, motion.kind, chroma, 'auto', 512)
              : await processSprite(raw, chroma)
            : null;
        if (
          processed &&
          (processed.backgroundFraction > 0.02 || processed.borderOpaqueFraction > 0.05)
        ) {
          logEvent(
            'asset_background_failed',
            { jobId: job.jobId, milestone: request.kind, count: attempt + 1 },
            'WARNING',
          );
          chroma = 'green';
          continue;
        }
        const image =
          processed?.webp ??
          layer?.webp ??
          (await sharp(raw, { limitInputPixels: 4096 * 4096 })
            .resize({ width: 2048, height: 1152, fit: 'cover' })
            .webp({ quality: 85 })
            .toBuffer());
        stage = 'REVIEW';
        if (
          !(await this.models.safeImage(
            image,
            request.description +
              (overlay
                ? ' Only the requested sparse decoration on a transparent canvas; no separate landscape, terrain, trees, floor or unrelated background painting.'
                : '') +
              (animated
                ? ` A production ${processed && 'animation' in processed ? processed.animation.frames : 9}-frame animation sheet of the SAME character, one complete articulated pose per frame, not different characters. All frames must preserve the requested identity, clothing and colours.`
                : ''),
          ))
        ) {
          logEvent(
            'asset_review_failed',
            { jobId: job.jobId, milestone: request.kind, count: attempt + 1 },
            'WARNING',
          );
          // A rejected image is never supplied as a repair reference.
          reference = undefined;
          repair = '';
          chroma = 'green';
          continue;
        }
        stage = 'STORAGE';
        const prefix = `assets/${hash}`;
        if (this.config.assetDirectory) {
          const dir = join(this.config.assetDirectory, prefix);
          await mkdir(dir, { recursive: true });
          await writeFile(join(dir, 'sprite.webp'), image);
          if (processed)
            await writeFile(join(dir, 'collider.json'), JSON.stringify(processed.collider));
        } else {
          await this.storage
            .bucket(this.config.bucket)
            .file(`${prefix}/sprite.webp`)
            .save(image, {
              contentType: 'image/webp',
              metadata: { cacheControl: 'public,max-age=31536000,immutable' },
            });
          if (processed)
            await this.storage
              .bucket(this.config.bucket)
              .file(`${prefix}/collider.json`)
              .save(JSON.stringify(processed.collider), {
                contentType: 'application/json',
                metadata: { cacheControl: 'public,max-age=31536000,immutable' },
              });
        }
        const record = AssetCacheDocSchema.parse({
          url: `${this.config.assetBaseUrl}/${prefix}/sprite.webp`,
          colliderUrl: processed ? `${this.config.assetBaseUrl}/${prefix}/collider.json` : null,
          width: processed?.width ?? 2048,
          height: processed?.height ?? 1152,
          safetyChecked: true,
          createdAt: Date.now(),
          ...(processed && 'animation' in processed ? { animation: processed.animation } : {}),
        });
        await db().doc(paths.assetCache(hash)).set(record);
        await addImages(job.uid, 1);
        return record;
      } catch (error) {
        logEvent(
          'asset_attempt_failed',
          {
            jobId: job.jobId,
            milestone:
              error instanceof MotionRegistrationError ? `ART_${error.code}` : `ART_${stage}`,
            count: attempt + 1,
          },
          'WARNING',
        );
        if (attempt === 1) throw error;
        reference = undefined;
        repair = '';
        if (animated && raw && error instanceof MotionRegistrationError) {
          repair = motionRepairInstruction(error.code);
          chroma = 'green';
          // Normalize known, bounded image input for the model's PNG reference part.
          reference = await sharp(raw, { limitInputPixels: 4096 * 4096 })
            .png()
            .toBuffer();
        } else if (!animated) chroma = 'green';
      }
    }
    throw new Error('Image did not pass safety or background checks');
  }
}

export class EditError extends Error {
  readonly retryable = false;
}
