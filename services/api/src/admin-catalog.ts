import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AgeBandSchema,
  CatalogEntryDocSchema,
  BilingualTextSchema,
  DocumentIdSchema,
  WorldDocSchema,
} from '@just-imagine/protocol';
import { WorldPackSchema, PACKS } from '@just-imagine/learning-content';
import { adminActor } from './admin-schools';
import { db, newId, read, fail, reasonSchema } from './school/common';
import { ApiFault } from './errors';
/** The audited view of an entry: scalar fields only, so the log can show what changed. */
function audited(entry: z.infer<typeof CatalogEntryDocSchema>) {
  return {
    status: entry.status,
    kind: entry.kind,
    titleEn: entry.title.en,
    titleBn: entry.title.bn,
    ageBands: entry.ageBands.join(', '),
  };
}
function catalogPack(input: unknown) {
  const pack = WorldPackSchema.parse(input);
  if (!/^catalog_[a-z0-9_]{1,24}$/.test(pack.id))
    return fail(
      400,
      'Story-pack ids must begin catalog_ and use lowercase letters, digits or underscores.',
    );
  if (pack.challenges.some((c) => !c.id.startsWith(pack.id + '_')))
    return fail(400, 'Challenge ids must begin with the catalog pack id.');
  return pack;
}
const path = (id: string) => 'catalog/' + id;
export function registerAdminCatalogRoutes(app: FastifyInstance) {
  app.register(async (routes) => {
    routes.addHook('preHandler', async (req) => {
      await adminActor(req);
    });
    routes.get('/v1/admin/catalog/templates', async () => ({ packs: Object.values(PACKS) }));
    routes.get('/v1/admin/catalog', async () => {
      const snap = await db().collection('catalog').limit(200).get();
      return {
        entries: snap.docs.map((d) => ({ id: d.id, ...CatalogEntryDocSchema.parse(d.data()) })),
      };
    });
    routes.post('/v1/admin/catalog/worlds', async (req) => {
      const body = z
          .object({
            worldId: DocumentIdSchema,
            title: BilingualTextSchema,
            ageBands: z.array(AgeBandSchema).min(1),
            reason: reasonSchema,
          })
          .parse(req.body),
        world = await read('worlds/' + body.worldId, WorldDocSchema).catch((e: unknown) => {
          if (e instanceof ApiFault && e.status === 404)
            return fail(404, 'No saved world has that id. Check the id and try again.');
          throw e;
        });
      if (world.status !== 'ready') return fail(400, 'Choose a ready, visible world.');
      const id = newId('j'),
        actor = await adminActor(req),
        entry = CatalogEntryDocSchema.parse({
          kind: 'world',
          status: 'draft',
          title: body.title,
          ageBands: body.ageBands,
          worldId: body.worldId,
          pack: null,
          publishedBy: null,
          publishedAt: null,
          updatedAt: Date.now(),
        });
      const batch = db().batch();
      batch.create(db().doc(path(id)), entry);
      batch.create(db().doc('adminAudit/' + newId('j')), {
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'catalog.create',
        target: { kind: 'catalog', id },
        before: null,
        after: { ...audited(entry), worldId: body.worldId },
        reason: body.reason,
        at: Date.now(),
      });
      await batch.commit();
      return { entry: { id, ...entry } };
    });
    routes.post('/v1/admin/catalog/packs', async (req) => {
      const body = z
          .object({
            pack: z.unknown(),
            title: BilingualTextSchema,
            ageBands: z.array(AgeBandSchema).min(1),
            reason: reasonSchema,
          })
          .parse(req.body),
        pack = catalogPack(body.pack),
        actor = await adminActor(req),
        id = newId('j');
      const entry = CatalogEntryDocSchema.parse({
        kind: 'storyPack',
        status: 'draft',
        title: body.title,
        ageBands: body.ageBands,
        worldId: null,
        pack,
        publishedBy: null,
        publishedAt: null,
        updatedAt: Date.now(),
      });
      await db().runTransaction(async (tx) => {
        const reserved = db().doc('catalogPackIds/' + pack.id);
        if ((await tx.get(reserved)).exists) return fail(409, 'That pack id is already reserved.');
        tx.create(reserved, { entryId: id });
        tx.create(db().doc(path(id)), entry);
        tx.create(db().doc('adminAudit/' + newId('j')), {
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'catalog.create',
          target: { kind: 'catalog', id },
          before: null,
          after: { ...audited(entry), packId: pack.id },
          reason: body.reason,
          at: Date.now(),
        });
      });
      return { entry: { id, ...entry } };
    });
    routes.patch('/v1/admin/catalog/:id', async (req) => {
      const { id } = z.object({ id: DocumentIdSchema }).parse(req.params),
        body = z
          .object({
            status: z.enum(['draft', 'published', 'retired']).optional(),
            title: BilingualTextSchema.optional(),
            ageBands: z.array(AgeBandSchema).min(1).optional(),
            pack: z.unknown().optional(),
            reason: reasonSchema,
          })
          .parse(req.body),
        actor = await adminActor(req);
      return db().runTransaction(async (tx) => {
        const ref = db().doc(path(id)),
          snap = await tx.get(ref);
        if (!snap.exists) return fail(404, 'Catalog entry not found.');
        const before = CatalogEntryDocSchema.parse(snap.data());
        if (body.pack !== undefined && catalogPack(body.pack).id !== catalogPack(before.pack).id)
          return fail(400, 'A published pack identity cannot change.');
        if (body.pack !== undefined && before.kind !== 'storyPack')
          return fail(400, 'Only story packs contain pack data.');
        const entry = CatalogEntryDocSchema.parse({
          ...before,
          ...body,
          ...(body.pack !== undefined ? { pack: catalogPack(body.pack) } : {}),
          ...(body.status === 'published'
            ? { publishedBy: actor.uid, publishedAt: Date.now() }
            : {}),
          updatedAt: Date.now(),
        });
        if (entry.status === 'published' && (!entry.title.en || !entry.title.bn))
          return fail(400, 'Both language titles are required to publish.');
        tx.set(ref, entry);
        tx.create(db().doc('adminAudit/' + newId('j')), {
          actorUid: actor.uid,
          actorEmail: actor.email,
          action:
            body.status === 'retired'
              ? 'catalog.retire'
              : body.status === 'published'
                ? 'catalog.publish'
                : 'catalog.update',
          target: { kind: 'catalog', id },
          before: audited(before),
          after: audited(entry),
          reason: body.reason,
          at: Date.now(),
        });
        return { entry: { id, ...entry } };
      });
    });
  });
}
