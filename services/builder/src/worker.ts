import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import {
  BuilderJobSchema,
  WorldDocSchema,
  UserDocSchema,
  ChildDocSchema,
  AssetCacheDocSchema,
  PLAN_LIMITS,
  paths,
  type BuilderJob,
  type WorldDoc,
} from '@just-imagine/protocol';
import { db, isKillSwitchOn, addImages, logEvent, traced } from '@just-imagine/server-core';
import { buildScene, patchScene, STYLE_BIBLE, SceneValidationError } from './pipeline';
import { nearestConceptFixture } from './fallback';
import { assetKey, processSprite } from './assets';
import type { VertexModels } from './vertex';

export class BuilderWorker {
  private storage = new Storage();
  constructor(
    private models: VertexModels,
    private config: { bucket: string; assetBaseUrl: string; assetDirectory?: string },
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
    let usedFallback = false;
    try {
      if (job.kind === 'patch') {
        await this.patch(job, lease);
        logEvent('builder_result', { jobId: job.jobId, success: true });
        return { status: 'complete' };
      } else {
        const doc = await traced('scene_build', { worldId: job.worldId, jobId: job.jobId }, () =>
          buildScene(job, this.models.generate),
        ).catch((error) => {
          if (!(error instanceof SceneValidationError)) throw error;
          usedFallback = true;
          logEvent('scene_fallback', { jobId: job.jobId, worldId: job.worldId }, 'WARNING');
          return nearestConceptFixture(job).doc;
        });
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
        });
        await this.publish(job, lease, world);
        const deadline = Date.now() + 25000;
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
                  kind: 'backdrop',
                  hero: true,
                },
              ]
            : []),
          ...doc.entities
            .filter((e) => e.kind === 'sprite')
            .sort(
              (a, b) =>
                Number(b.id === doc.learning.heroEntityId) -
                Number(a.id === doc.learning.heroEntityId),
            )
            .slice(0, PLAN_LIMITS[job.plan].imagesPerWorld)
            .map((e) => ({
              id: e.id,
              description: e.description,
              kind: 'sprite',
              hero: e.id === doc.learning.heroEntityId,
            })),
        ];
        let nextRequest = 0;
        const generateNext = async () => {
          while (nextRequest < requests.length) {
            const request = requests[nextRequest++]!;
            if (usedFallback || Date.now() > deadline || (await isKillSwitchOn())) return;
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
                ...(asset.colliderUrl ? { colliderUrl: asset.colliderUrl } : {}),
              };
              if (request.id === 'backdrop') {
                world.doc.theme.backdrop = ref;
                world.thumbnailUrl = asset.url;
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
          status: usedFallback ? 'fallback' : 'complete',
          finishedAt: Date.now(),
        });
        tx.delete(lockRef);
      });
      logEvent('builder_result', {
        jobId: job.jobId,
        success: !usedFallback,
        ...(usedFallback ? { milestone: 'fallback' } : {}),
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
    const patched = await patchScene(world.doc, job.instruction, this.models.generate);
    await db().runTransaction(async (tx) => {
      const lockRef = db().doc(`worldLocks/${job.worldId}`);
      const [lock, parentDelete, childDelete, worldDelete] = await Promise.all([
        tx.get(lockRef),
        tx.get(db().doc(`deletionLocks/${job.uid}`)),
        tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
        tx.get(db().doc(`worldDeletionLocks/${job.worldId}`)),
      ]);
      if (
        lock.data()?.['lease'] !== lease ||
        parentDelete.exists ||
        childDelete.exists ||
        worldDelete.exists
      )
        throw new Error('World no longer writable');
      tx.set(
        ref,
        WorldDocSchema.parse({
          ...world,
          doc: patched.doc,
          status: 'ready',
          title: patched.doc.title,
          concepts: patched.doc.learning.concepts,
          jobId: job.jobId,
          updatedAt: Date.now(),
        }),
      );
      tx.set(db().collection(paths.worldVersions(job.worldId)).doc(job.jobId), {
        doc: patched.doc,
        patch: patched.patch,
        reason: job.instruction,
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
    request: { id: string; description: string; kind: string; hero: boolean },
  ) {
    const style = job.kind === 'build' ? job.styleVersion : 'v1';
    const hash = assetKey(request.description, request.kind, style);
    const cached = AssetCacheDocSchema.safeParse(
      (await db().doc(paths.assetCache(hash)).get()).data(),
    );
    logEvent('asset_cache', {
      jobId: job.jobId,
      cached: cached.success && cached.data.safetyChecked,
    });
    if (cached.success && cached.data.safetyChecked) return cached.data;
    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt = `${STYLE_BIBLE} ${request.description}. ${request.kind === 'sprite' ? 'Full body, centered, flat pure magenta #FF00FF background, soft rim light, no shadow on background, no text.' : 'Wide 16:9 landscape, no text, no foreground characters.'}${attempt ? ' Strictly follow safety and background requirements.' : ''}`;
      const raw = await this.models.image(prompt, request.hero, request.kind !== 'sprite');
      const processed = request.kind === 'sprite' ? await processSprite(raw) : null;
      if (processed && processed.magentaFraction > 0.02) continue;
      const image =
        processed?.webp ??
        (await sharp(raw, { limitInputPixels: 4096 * 4096 })
          .resize({ width: 2048, height: 1152, fit: 'cover' })
          .webp({ quality: 85 })
          .toBuffer());
      if (!(await this.models.safeImage(image, request.description))) continue;
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
      });
      await db().doc(paths.assetCache(hash)).set(record);
      await addImages(job.uid, 1);
      return record;
    }
    throw new Error('Image did not pass safety or background checks');
  }
}
