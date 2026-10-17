---
version: 1
slug: 'lesson-text-assist'
primary_target: 'components/school/LessonTextAssist.tsx'
related_targets:
  [
    'components/school/Lessons.tsx',
    'components/school/LessonTextAssist.module.css',
    'lib/school/text-assist.ts',
  ]
---

# Surface brief: Lesson writing help

Mode: Operate. A teacher or operator drafts or refines one lesson text field with AI, inspects a plain-text proposal, then explicitly applies or discards it. Existing forest/cream semantic presets, Baloo headings, Nunito explanations and manual author controls remain intact. No new artwork or page palette.

Every title, explanation, exploration instruction, lab goal, question, answer option and hint has an initially collapsed native details control. It exposes three writing styles plus an optional custom instruction, works before first save, and reads current unsaved text and relevant subject/chapter/simulation/question context. English and Bangla interface copy lives locally; the editor language determines the requested proposal language. Whole-lesson drafting and translation remain separate, explicitly requested tools near the editor top and require saving current changes first.

The response is validated and displayed as escaped text. Apply updates one language only and clears both language approvals; no answer key, scientific parameter, save, approval or publication is performed automatically. Questions/options/hints remind authors to review the answer key. Captured text, language and full local context must still match before Apply; an edited field or changed context disables stale proposals. Async work cannot set state after the helper is removed. Errors retain the teacher's text and expose the existing localized school error treatment. Operator assistance includes the required audit reason.

Controls retain visible focus and 44px targets; helper form fields use at least 16px text, wrap on phones and remain separate from the owning field label. Pure regressions cover unsaved generation, request bounds, science context, stale edits/language/context, opposite-language preservation and approval invalidation with immutable science/key data. Native Chrome acceptance used real Generate and Refine requests on an unsaved lesson, verified stale-proposal rejection and explicit Apply, and confirmed the opposite language stayed blank. The draft was abandoned without saving, approving or publishing. The isolated API workflow verifies normal quota use and unchanged saved lessons. The full web suite, type/lint tasks and production build pass. Native phone AI-form acceptance has not been separately performed.

The school quality pass also validates requested-language prose and preserves numeric facts/common SI quantities across refinement/translation. Bangla numerals and common unit names are supported; unrecognized scientific semantics still require teacher review. Provider proposals that fail these guards leave saved text unchanged.
