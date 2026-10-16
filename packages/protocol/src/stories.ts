import { z } from 'zod';
import { DocumentIdSchema } from './primitives';

export const StoryPreferencesSchema = z.strictObject({
  learningGoals: z
    .string()
    .trim()
    .max(1000)
    .default('Curiosity, kindness and solving problems together.'),
  avoidTopics: z.string().trim().max(500).default(''),
  length: z.enum(['short', 'long']).default('long'),
});
export type StoryPreferences = z.infer<typeof StoryPreferencesSchema>;
export const storyPreferencesOf = (child: { storyPreferences?: StoryPreferences }) =>
  child.storyPreferences ?? StoryPreferencesSchema.parse({});
const sceneId = z.string().regex(/^[a-z][a-z0-9_-]{0,40}$/);
const prose = z.string().trim().min(1).max(1000);
export const StoryActionSchema = z.enum([
  'discover',
  'travel',
  'build',
  'help',
  'observe',
  'celebrate',
]);
export const StoryBeatSchema = z.strictObject({
  text: prose,
  action: StoryActionSchema,
  focus: z.string().trim().min(1).max(90),
});
export const StorySceneSchema = z.strictObject({
  id: sceneId,
  title: z.string().min(1).max(100),
  illustration: z.string().min(30).max(1800),
  atmosphere: z.enum(['forest', 'ocean', 'cosmos', 'village', 'workshop', 'garden']),
  beats: z.array(StoryBeatSchema).min(2).max(4),
  discovery: z.strictObject({ label: z.string().min(1).max(70), explanation: prose }),
  question: z.string().min(1).max(240),
  choices: z
    .array(
      z.strictObject({
        id: sceneId,
        label: z.string().min(1).max(100),
        response: prose,
        nextAction: StoryActionSchema,
      }),
    )
    .length(2),
  lesson: z.string().min(1).max(400),
});
export const StoryManuscriptSchema = z
  .strictObject({
    title: z.string().min(1).max(100),
    synopsis: z.string().min(1).max(400),
    castDescription: z.string().min(20).max(1200),
    learningGoals: z.array(z.string().min(1).max(200)).min(1).max(5),
    scenes: z.array(StorySceneSchema).min(3).max(6),
    ending: prose,
  })
  .superRefine((book, ctx) => {
    if (new Set(book.scenes.map((s) => s.id)).size !== book.scenes.length)
      ctx.addIssue({ code: 'custom', path: ['scenes'], message: 'Scene ids must be unique' });
    for (const [i, s] of book.scenes.entries())
      if (s.choices[0]!.id === s.choices[1]!.id)
        ctx.addIssue({
          code: 'custom',
          path: ['scenes', i, 'choices'],
          message: 'Choice ids must be unique',
        });
  });
export type StoryManuscript = z.infer<typeof StoryManuscriptSchema>;
export type StoryScene = z.infer<typeof StorySceneSchema>;
export const StoryImageSchema = z.object({
  status: z.enum(['waiting', 'ready', 'failed']),
  url: z.url().optional(),
});
export const StoryProgressSchema = z.strictObject({
  scene: z.number().int().min(0).max(5),
  beat: z.number().int().min(0).max(3),
  choices: z.record(z.string(), z.string()).default({}),
  completed: z.boolean().default(false),
});
export const StoryDocSchema = z.object({
  id: DocumentIdSchema,
  ownerUid: DocumentIdSchema,
  childId: DocumentIdSchema,
  topic: z.string().trim().min(3).max(600),
  generationId: DocumentIdSchema,
  canRetry: z.boolean().default(true),
  writtenScenes: z.number().int().min(0).max(6).default(0),
  language: z.enum(['en', 'bn']),
  ageBand: z.enum(['6-7', '8-10', '11-13']),
  preferences: StoryPreferencesSchema,
  status: z.enum(['queued', 'writing', 'illustrating', 'ready', 'failed']),
  manuscript: StoryManuscriptSchema.nullable(),
  images: z.record(z.string(), StoryImageSchema),
  progress: StoryProgressSchema,
  revision: z.number().int().nonnegative(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  error: z.string().max(300).optional(),
});
export type StoryDoc = z.infer<typeof StoryDocSchema>;
export const CreateStorySchema = z.strictObject({
  topic: z.string().trim().min(3).max(600),
  requestId: DocumentIdSchema,
});
export const UpdateStoryProgressSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  progress: StoryProgressSchema,
});
export const StoryBuildJobSchema = z.strictObject({
  kind: z.literal('story'),
  jobId: DocumentIdSchema,
  storyId: DocumentIdSchema,
  uid: DocumentIdSchema,
  childId: DocumentIdSchema,
});
export type StoryBuildJob = z.infer<typeof StoryBuildJobSchema>;
export const STORY_ROUTES = {
  createStory: { method: 'POST', path: '/v1/children/:childId/stories' },
  listStories: { method: 'GET', path: '/v1/children/:childId/stories' },
  getStory: { method: 'GET', path: '/v1/stories/:storyId' },
  updateStory: { method: 'PATCH', path: '/v1/stories/:storyId' },
  retryStory: { method: 'POST', path: '/v1/stories/:storyId/retry' },
  deleteStory: { method: 'DELETE', path: '/v1/stories/:storyId' },
} as const;
