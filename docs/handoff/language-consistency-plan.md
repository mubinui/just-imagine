# English and Bangladeshi Bangla consistency — 2026-10-16

User: live mode supports only English and Bangla. The selected setting governs all interface screens and the current speaker; Bangla names and sentences must be meaningful, natural Bangladeshi Bangla. English mode must not leak Bangla interface copy. Preserve the warm visual system, gameplay, user data, credentials and published release tag.

## Research

- Protocol already validates `en|bn`, but the main companion prompt never pins a language. Other speaker prompts say Bengali/Bangla without a consistent exclusive Bangladesh instruction. New scene authoring similarly lacks a firm user-visible language contract.
- LanguageRoot only wraps child route content and explicitly resets parent screens to English. Shared header is outside it. Profile selection writes localStorage without notifying existing subscribers. Parent save currently can switch the browser even after the API save helper catches failure.
- Most old table strings are bilingual, but companion navigation/setup, parent settings, story preferences, admin, landing/privacy and several errors contain direct English. Some loading states deliberately show both languages. Authored pack/game texts and preset names need a Bangladesh wording pass.
- Saved user/generator content has its own original language; the user confirmed translated editions are required. Implement the shared setting, UI/voice and new generation independently while resolving that boundary.

## Implementation order

1. One reactive language scope across the application; profile selection and successful settings save notify it. Keep both allowed values strict, persist browser preference and stop stale-language voice when switching. Do not change language after failed saves.
2. Localize shared navigation, parent/auth/onboarding, companion, story, game/HUD, marketing/privacy and operator controls. Use explicit authored catalog entries, never DOM text replacement. Technical identifiers/user-entered names remain data. Localize numerals/dates/labels and remove mixed-language loading/errors.
3. Review Bangla glossary and sentences: তুমি for children, আপনি for adults, পানি/গোসল/দাঁত মাজা/হাত ধোয়া and age-appropriate scientific explanations. Preset names have deliberate Bangla-script forms. Maintain complete English equivalents.
4. Apply a shared exclusive language policy to all Live personas, Katha, created characters, game/compiler and story generation; never let English source/tool text override it. Preserve the soothing voice and playback behavior.
5. User confirmed translated saved-content editions: translate owned display prose and dynamic game captions, cache under each source, preserve originals/IDs/scripts/physics/art/progress, invalidate when source text changes, fence deletion and ownership. Use the same cached story edition for Live narration.
6. Meaningful language propagation/save-failure/auth/prompt tests; real English/Bangla voice and generated text checks; browser screen inventory for wrong-script leaks, reload/navigation and setting switches; desktop/phone localization layout and required finish handoffs. Update TODO and CHECKPOINT. Do not overwrite the existing demo tag.
