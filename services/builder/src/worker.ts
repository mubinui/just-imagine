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
import { db, isKillSwitchOn, addImages, logEvent, traced } from '@just-imagine/server-core';
import { buildScene, patchScene, STYLE_BIBLE } from './pipeline';
import { assetKey, processSprite, processMotionAtlas, MotionRegistrationError } from './assets';
import type { VertexModels } from './vertex';
import { guardPatchedGame, imagineGame, type ImagineGameDeps } from './imagine-game';
import { initialCreation, reviseCreation } from './revisions';
import { applyPaintedFloor } from './presentation';
import { layerArtPrompt, processLayerArt } from './layer-art';
import {
  motionArt,
  sameMotionArt,
  locomotionImagePrompt,
  requireMotionArtwork,
  motionRepairInstruction,
  hasMotionArtwork,
} from './motion';
import type { PatchOp, AssetRef, Locomotion } from '@just-imagine/scene-schema';

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
      await db().runTransaction(async (tx) => {
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
    const claim = await db().runTransaction(async (tx) => {
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
      tx.set(lockRef, { lease, expiresAt: Date.now() + 360000 });
      return true;
    });
    if (!claim) return { status: 'already-complete' };
    try {
      if (job.kind === 'patch' || job.kind === 'undo') {
        if (job.kind === 'undo') await this.undo(job, lease);
        else await this.patch(job, lease);
        logEvent('builder_result', { jobId: job.jobId, success: true });
        return { status: 'complete' };
      } else {
        const doc = await traced(
          'scene_build',
          { worldId: job.worldId, jobId: job.jobId },
          async () => {
            if (!this.game) return buildScene(job, this.models.generate);
            const built = await imagineGame(job, {
              ...this.game,
              generateScene: this.models.generate,
              reviewScene: this.models.reviewScene,
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
        let world: WorldDoc = WorldDocSchema.parse({
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
        await this.publish(job, lease, world);
        const deadline = Date.now() + 180000;
        const requests = [
          {
            id: 'backdrop',
            description: doc.theme.backdropDescription,
            kind: 'backdrop',
            hero: true,
          },
          ...(doc.theme.midLayerDescription
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
            .filter((e) => e.kind === 'sprite')
            .sort(
              (a, b) =>
                Number(b.id === doc.learning.heroEntityId) * 2 +
                Number(Boolean(b.character)) -
                (Number(a.id === doc.learning.heroEntityId) * 2 + Number(Boolean(a.character))),
            )
            .slice(0, PLAN_LIMITS[job.plan].imagesPerWorld)
            .map((e) => ({
              id: e.id,
              description: e.description,
              kind: 'sprite',
              hero: e.id === doc.learning.heroEntityId || Boolean(e.character),
              ...(e.locomotion ? { locomotion: e.locomotion } : {}),
            })),
        ];
        let nextRequest = 0;
        const generateNext = async () => {
          while (nextRequest < requests.length) {
            const request = requests[nextRequest++]!;
            if (Date.now() > deadline || (await isKillSwitchOn())) return;
            world.assets[request.id] = { status: 'generating' };
            await this.publish(job, lease, world);
            try {
              const asset = await this.asset(job, request);
              world.assets[request.id] = {
                status: 'ready',
                url: asset.url,
                ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
              };
              const ref = {
                status: 'ready' as const,
                url: asset.url,
                width: asset.width,
                height: asset.height,
                ...(asset.animation ? { animation: asset.animation } : {}),
                ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
              };
              if (request.id === 'backdrop') {
                world.doc.theme.backdrop = ref;
                world.thumbnailUrl = asset.url;
                applyPaintedFloor(world.doc);
              } else if (request.id === 'midLayer') world.doc.theme.midLayer = ref;
              else {
                const entity = world.doc.entities.find((e) => e.id === request.id);
                if (entity) entity.asset = ref;
              }
            } catch {
              logEvent(
                'asset_failed',
                { jobId: job.jobId, milestone: request.kind, success: false },
                'WARNING',
              );
              world.assets[request.id] = { status: 'failed' };
            }
            await this.publish(job, lease, world);
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(4, requests.length) }, () => generateNext()),
        );
        requireMotionArtwork(world.doc);
        world = { ...world, status: 'ready' };
        await this.publish(job, lease, world);
      }
      await db().runTransaction(async (tx) => {
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
      logEvent(
        'builder_result',
        { jobId: job.jobId, worldId: job.worldId, success: false },
        'ERROR',
      );
      await db().runTransaction(async (tx) => {
        const [lock, world, parentDelete, childDelete, worldDelete] = await Promise.all([
          tx.get(lockRef),
          tx.get(db().doc(paths.world(job.worldId))),
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
          tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
        ]);
        if (lock.data()?.['lease'] !== lease) return;
        if (!parentDelete.exists && !childDelete.exists && !worldDelete.exists)
          tx.update(jobRef, { status: 'failed', finishedAt: Date.now() });
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
    await db().runTransaction(async (tx) => {
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
    requireMotionArtwork(next.doc);
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
        const asset = await this.asset(job, request);
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
    await db().runTransaction(async (tx) => {
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
  private async asset(
    job: BuilderJob,
    request: {
      id: string;
      description: string;
      kind: string;
      hero: boolean;
      locomotion?: Locomotion;
    },
  ) {
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
