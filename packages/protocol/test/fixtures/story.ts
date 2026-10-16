import { StoryManuscriptSchema, StoryDocSchema } from '../../src/stories';
export const manuscript = () =>
  StoryManuscriptSchema.parse({
    title: 'The Moon’s Garden',
    synopsis: 'A rabbit learns to care for a garden with a planet friend.',
    castDescription: 'A cream rabbit wearing a green scarf and a small warm blue planet.',
    learningGoals: ['Sharing water and asking curious questions'],
    scenes: Array.from({ length: 3 }, (_, i) => ({
      id: `scene_${i}`,
      title: `The garden ${i + 1}`,
      illustration:
        'A beautiful wide moon garden with the cream rabbit and the friendly blue planet, little plants in a row.',
      atmosphere: 'garden',
      beats: Array.from({ length: 3 }, () => ({
        text: 'The rabbit looked at the dry garden and asked her friend to help. Together they noticed that the little leaves were drooping. They carried a small cup of water to the roots, then waited and watched carefully. A curious question led them to try one kind idea together.',
        action: 'help',
        focus: 'The little green leaves',
      })),
      discovery: {
        label: 'A green leaf',
        explanation: 'Leaves use light to help a plant make its food.',
      },
      question: 'How shall we help the garden?',
      choices: [
        {
          id: 'water',
          label: 'Share some water',
          response: 'They share their water with the roots and watch the soil become damp.',
          nextAction: 'help',
        },
        {
          id: 'observe',
          label: 'Look at the leaves',
          response:
            'They notice a leaf turning toward the light and make a little drawing together.',
          nextAction: 'observe',
        },
      ],
      lesson: 'Plants need suitable water and light to grow.',
    })),
    ending: 'They shared what they learned and returned the next day to observe their garden.',
  });
export const storyBook = () =>
  StoryDocSchema.parse({
    id: 'story_test',
    ownerUid: 'parent',
    childId: 'c_mira',
    topic: 'A rabbit and a talking planet grow a garden',
    generationId: 'story_test_0',
    language: 'en',
    ageBand: '8-10',
    preferences: {
      learningGoals: 'Sharing water and asking questions',
      avoidTopics: '',
      length: 'short',
    },
    status: 'queued',
    manuscript: null,
    images: {},
    progress: { scene: 0, beat: 0, choices: {}, completed: false },
    revision: 0,
    createdAt: 1,
    updatedAt: 1,
  });
