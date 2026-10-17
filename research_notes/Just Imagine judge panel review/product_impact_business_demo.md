# Just Imagine as a product, impact story, business and hackathon demo (non-engineering judge view)

Scope: how a Google Cloud startup/business lead, an edtech impact expert and a DevRel demo judge would read the repository at `/Users/mubinuiislam/Home/Hackathons/just-imagine` on 2026-10-17, and what must change before a late-November 2026 submission. Repository facts are cited as `path` or `path:line` (primary sources inside the repo). External facts carry a URL. Pricing figures are from Google's pricing page as last updated 2026-10-16 and will change on 2026-12-01 (Argon) and 2027-01-01 (Flash, TTS).

Repo baseline that frames everything below: the design spec is dated 2026-10-15 (`docs/superpowers/specs/2026-10-15-just-imagine-design.md`), the first commit is 2026-10-15 and the latest is 2026-10-17 (`git log`), there is one committer (`git shortlog -sn --all` shows only `mubinui`), 28 commits on the current branch, and about 59,855 lines of TypeScript/TSX across `apps`, `services` and `packages` excluding `node_modules`. The whole artefact is three days old.

---

## Key question 1: Problem and audience. Is the problem crisp, who pays, and is the Bangladesh angle a strength or an afterthought?

### Takeaway
There is no problem statement anywhere in the repo: README, spec and landing page open with the solution ("imagination to simulation"), not with what is broken for a Bangladeshi 6 to 13-year-old or their parent, and no statistic or interview supports an audience need. The Bangladesh angle (Bengali character names, Bangladeshi Bangla voice and UI) is real and rare in the market, but it is presented as localisation, not as the reason the product exists.

### Cited Findings
- README's first line is the solution: "Imagination to simulation for children aged 6 to 13 ... Every world teaches the real physics behind what the child imagined, and the session structure gradually lengthens attention span." No problem, no evidence — `README.md:3`.
- Spec §1 Purpose is also solution-first: "Just Imagine is a web SaaS for children aged 6 to 13 ... The product is both entertainment and learning" — `docs/superpowers/specs/2026-10-15-just-imagine-design.md` §1.
- Spec §2 names the payer: "Secondary user: the parent. Creates the account, gives consent, manages child profiles, sees progress, and pays." Schools are explicitly out of scope in the original spec (§18 "teacher or classroom mode") and are re-added as a second product line in the 2026-10-17 schools spec where "Schools are not billed" (D12) — `docs/superpowers/specs/2026-10-17-schools-stem-design.md` §2.
- The landing page copy is generic ("A world of 'what if?'", "For curious minds, ages 6–13. And the grown-ups who cheer them on.") with no mention of Bangladesh, Bangla, or a learning problem — `apps/web/app/page.tsx:17-48`, `apps/web/lib/strings/en.ts:28-32`.
- The original spec set "Language. English." and listed Bangla as "first after submission" (§2, §18); Bangla was then shipped two days later as a full parity edition with Bangladeshi vocabulary rules (`docs/i18n/bangla-review.md`, `docs/handoff/language-operations.md`).
- Character names are Bengali children's favourites (Mishti, Bhombol, Chandni, Pori Apu, Onko Mama, Jadu Kaka) and the eight pets have Bangla names (Tuktuk, Chiku, Meghla, Dhumketu) — `packages/protocol/src/characters.ts`, `packages/learning-content/src/pets.ts`.
- The Bangla review itself says "No native reader's approval is recorded here" and "A Bangladesh reader should still review legal/consent meaning, scientific ambiguity and unfamiliar loanwords" — `docs/i18n/bangla-review.md`.
- Bangladesh learning context a judge would expect to hear: the 2022 National Student Assessment found 51 percent of grade-3 students met the Bangla competency and 39 percent met the mathematics competency, down from 67 and 50 percent in 2011; science is not assessed at primary level — [Bonik Barta](https://en.bonikbarta.com/bangladesh/DrRxmQ7BLKMDPxSx/), [World Bank, Whither Quality](https://documents1.worldbank.org/curated/en/489301625254132791/pdf/Whither-Quality-What-Do-Recent-National-Assessments-of-Student-Learning-Outcomes-in-Bangladesh-Tell-Us.pdf). The World Bank analysis also found students "perform relatively well in areas related to knowledge and understanding" but struggle with "application of higher-order thinking skills" — same source.
- A 2021 report cited in the Bangladeshi press found 70 percent of primary students are assessed through rote memorisation; 40 percent of public primary schools have over 50 students per class — [Financial Express](https://thefinancialexpress.com.bd/education/enhancing-primary-education-quality).
- Device reality: household smartphone ownership 73.4 percent and household internet access 57.4 percent (BBS, Jan–Mar 2026); only 9.1 percent of households own a computer; 80.8 percent urban vs 68.8 percent rural smartphone households — [Dhaka Tribune](https://www.dhakatribune.com/bangladesh/415972/bbs-survey-over-57%25-of-bangladeshi-households-now), [UNB](https://unb.com.bd/category/Bangladesh/mobile-phone-ownership-rises-bbs/195830). Most phones sold in Bangladesh are under US$150 — [Counterpoint via MEA Tech Watch](https://meatechwatch.com/?p=35432).
- Gemini Live on Vertex lists Bengali (Bangladesh), `bn-BD`, among its configurable languages — [Google Cloud Live API language page](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/configure-language-voice). For native-audio models the language is pinned through system instructions, which is what the repo does (`packages/protocol/src/language-policy.ts` per `docs/handoff/language-operations.md`).
- Sisimpur (Sesame Workshop's Bangladesh co-production) reaches roughly 10 million children through BTV, Duronto and Maasranga and has 90 million YouTube views; Sesame Workshop research showed measurable gains in vocabulary, numeracy and life skills after 20 days of viewing — [Daily Star](https://www.thedailystar.net/arts-entertainment/news/sisimpur-air-seven-days-week-btv-1967789), [Comminit](https://reference.comminit.com/content/sisimpur). This is the local proof that character-led Bangla learning media works, and the repo never references it.

### Inferences
- The one-sentence problem the team has but has not written: "Bangladeshi children learn science by memorising; there is no Bangla-speaking, play-first way for a 6 to 10-year-old to ask 'what if' and see real physics answer, and the parent has no window into it." Everything in the product supports that sentence; nothing in the docs says it.
- The paying customer is confused across the two specs: the family product bills parents at a US price point through Stripe; the schools product is unbilled and manually provisioned. A business judge will ask "who writes the cheque" and currently gets two half-answers.
- Bangladesh is the strongest differentiator the team has (Bangla voice characters for 6-year-olds do not exist in the competitive set below) and it is currently buried as an i18n feature. Lead with it.
- The device data says the realistic Bangladeshi delivery surface is a sub-$150 Android phone on metered data, not the spec's "tablet-first in landscape ... 2022 iPad" (spec §2, §6.7). The repo did add phone layouts (390×844 checks throughout `CHECKPOINT.md`), but the pitch still says tablet.

### Gaps
- No interviews, surveys or secondary data on Bangladeshi parents' appetite for a paid play/learning app for 6 to 10-year-olds were found in the repo or the web search; willingness-to-pay for this segment is unknown.
- No primary-level science outcome data exists for Bangladesh (NSA covers Bangla and maths only), so the "science is broken" claim must lean on rote-learning and higher-order-skill evidence rather than a science score.

---

## Key question 2: Focus and scope. Inventory, count, and which surfaces carry the pitch

### Takeaway
Twenty-four distinct feature surfaces exist in code or in approved specs, produced in three days by one committer with two AI agents; this reads as platform sprawl, not a product. Three surfaces carry the entire pitch (voice wish → painted physics world with the Predict/Discover loop, the Bangla voice cast, and the parent's view of what was learned); roughly fifteen should be hidden for the demo.

### Cited Findings
Feature-surface inventory (exists = present in `apps/web/app` routes or packages on this branch; schools items exist only in separate worktrees per `docs/handoff/schools-collaboration.md`).

| # | Surface | Exists in code? | Pitch-critical? | Hide for demo? | Evidence |
|---|---|---|---|---|---|
| 1 | Landing page with playable Earth/Moon gravity experiment | Yes | Supporting (30 s) | Show only as the opening frame | `apps/web/app/page.tsx`, `components/GravityPlayground.tsx` |
| 2 | Parent sign-up/sign-in with consent checkbox (Google + email) | Yes | No | Pre-authenticate before the demo | `apps/web/app/sign-up/page.tsx`, `components/AuthForm.tsx` |
| 3 | "Who's imagining today?" profile picker (audio unlock gesture) | Yes | Supporting | Show for 3 s, it is the iOS audio unlock | `components/ProfilePicker.tsx` |
| 4 | Studio: voice wish → Scene DSL → PixiJS/Rapier world, dials (gravity/wind/material), prediction, Discovery Card toast | Yes | **Yes, the core** | Never | `components/Studio.tsx`, `components/studio/*`, `packages/engine` |
| 5 | Generation show (narrated painting sequence instead of spinner) | Yes | Yes (covers latency) | Never | `components/studio/GenerationShow.tsx`, strings `show.*` in `en.ts` |
| 6 | Companions and guides (6 characters, handoff, summon, Jadu Kaka spells) | Yes (SVG cast, no Rive) | Yes (two characters max) | Show Bhombol + one guide; hide spells unless rehearsed | `packages/protocol/src/characters.ts`, `CHECKPOINT.md` "six authored SVG characters" |
| 7 | Labs tier: sliders, plots, histogram, ruler, challenges, numeric keypad | Yes (fixtures: projectile, Galton, fractions) | Only if pitching 11–13 | Hide for a 6–10 demo | spec §3.6, `components/studio/LabDrawer.tsx` |
| 8 | Generated games: Gemini-written script in a sandboxed worker with static check, budgets and headless smoke run; HUD | Yes | Innovation talking point, not a live demo | Show a pre-generated one; do not generate live | `packages/game-runtime`, `services/builder/src/imagine-game.ts`, `game-playtest.ts` |
| 9 | World cast: child-created characters in generated worlds with their own Live voice; play-settings rules; undo/revisions | Yes | Partly (the "talk to your planet" moment) | Show once if pre-built | `docs/handoff/planet-characters-upgrade.md`, `en.ts` `worldCast.*`, `creation.undo` |
| 10 | Free-text authoring box in Studio (typed wishes) | Yes | No (contradicts spec "no typed chat") | Hide | `en.ts` `creation.help: 'Say it or write it...'`; spec §2 "Nobody types free text" |
| 11 | Gallery of saved worlds | Yes | Supporting (5 s) | Show briefly | `app/(child)/gallery/page.tsx` |
| 12 | Learning Worlds map: 6 sections, 9 packs, 40 callable characters, 48 challenges, toy-phone "call" | Yes | No (second product inside the product) | Hide, or one 15 s beat ("call Saturn") | `packages/learning-content/src/packs/*.json` (9 packs; character counts 4/4/4/5/3/5/3/3/9; challenge counts 5/4/4/6/4/6/4/4/11) |
| 13 | Story-led adventures: 9 adventures, 40 chapters with six manipulation games | Yes | No | Hide | `packages/learning-content/src/adventures.ts` (998 lines), `components/learn/AdventureBoard.tsx` |
| 14 | Points and 8 collectible pets (buddy follows the hero) | Yes (pet sounds "do not exist yet") | No | Hide | `packages/learning-content/src/pets.ts`, `docs/art/animal-sounds-provenance.md` last bullet |
| 15 | Katha's story room: generated long illustrated books with choices, questions, saved progress | Yes | No ("A new long book takes several minutes") | Hide | `components/stories/StoryRoom.tsx`, `docs/handoff/story-stage-operations.md` |
| 16 | Personal chibi companion from a parent-uploaded child photo, with voice navigation tools | Yes | No, and a legal liability (child facial image to a model) | Hide | `components/companion/CompanionSetup.tsx`, `apps/web/app/privacy/page.tsx` |
| 17 | Sound pack (40 synthesised cues) and per-theme music beds | Yes | Supporting | Keep on | `docs/art/sound-provenance.md` |
| 18 | Parent dashboard (minutes, discoveries, sessions), Children CRUD, Settings (language, session target, story prefs, learning goals, deletion) | Yes | **Yes (the "what did my child learn" view)** | Show dashboard only | `app/(parent)/parent/*`, `components/ParentPanels.tsx` |
| 19 | Plan and billing (Free/Family, Stripe test checkout and portal) | Yes (test mode, no keys) | No | Hide | `services/api/src/billing.ts`, `packages/protocol/src/plans.ts` |
| 20 | Super admin console: overview, families, safety log, content, system/kill switch, audit, appearance themes | Yes | No | Hide (one slide at most: "operator safety log") | `app/admin/(console)/*` (7 pages), `docs/handoff/ui-theme-operations.md` |
| 21 | English/Bangla parity for all screens, Live speech and translated editions of saved content | Yes | **Yes (the differentiator)** | Never; demo in Bangla with English captions | `apps/web/lib/i18n/*` (1,297 lines), `CHECKPOINT.md` "Completed checkpoint — English and Bangladeshi Bangla" |
| 22 | Draw-your-own shapes mode | Spec only (quality programme §6) | No | n/a | `2026-10-16-quality-program-design.md` §6 |
| 23 | Schools + STEM: super admin schools, teacher console, student PIN login, NCTB 9–10 sims, chemistry lab, quizzes, leaderboards, Live tutor | Spec + S0/S3 in separate worktrees only | No for this submission | Hide entirely; mention as roadmap in one sentence | `docs/superpowers/specs/2026-10-17-schools-stem-design.md`, `TODO.md` "Schools + STEM" (S1, S2, S4–S7 unchecked) |
| 24 | Fixture preview mode (port 3200, no mic, no payments) | Yes | Backup only | Keep as the fallback laptop | `README.md` "Run the application" |

- The quality programme's own opening admits why the sprawl happened: "It does not yet feel like a product a child would choose over a mobile game. Worlds render as placeholder rectangles, there is no sound ... the characters have never spoken through Vertex AI" — `docs/superpowers/specs/2026-10-16-quality-program-design.md` §1. The response was to add seven new surfaces (library art, draw mode, generated games, Learning Worlds, Bangla, admin panel, device matrix) in a five-week plan, and then a day later Story room, companions, pets, adventures and a schools product line.
- CLAUDE.md still describes a different product: "children aged 6 to 10 ... three animal characters (Pip the kitten, Bolt the puppy, Luna the cat)" while README says 6 to 13 and the cast is Mishti/Bhombol/Chandni — `CLAUDE.md` line 3 vs `README.md:3`, `packages/protocol/src/characters.ts`. The schools spec notes this itself (§3 "`CLAUDE.md`: the opening line still says 'children aged 6 to 10'").

### Inferences
- A judge who opens `TODO.md` sees eleven parallel workstreams and a schools product; the honest read is "one person and two agents building Disney, Khan Academy and a school LMS at once in three days". That is the reading to pre-empt by hiding surfaces, not by explaining them.
- The one unforgettable moment is already in the design and the code: a child says a wish in Bangla, the friend narrates while the world paints in, the child predicts "bounce or splat", flicks the jelly dragon, Bhombol explains bounciness, and then the Moon dial makes the same dragon float. Everything else is supporting cast.
- Surfaces 12–16 (Learning Worlds, adventures, pets, story room, photo companion) are a second product ("authored curriculum with callable characters") that competes with the first for the judge's attention and doubles the safety surface. Keep them in the build, keep them out of the video.

### Gaps
- Draw mode, Rive character rigs and recorded reaction clips are specified but not present; the inventory could not confirm whether draw mode exists under another name (no `draw` component was found under `apps/web/components/studio`).

---

## Key question 3: Impact evidence and learning science

### Takeaway
No child, parent or teacher has used Just Imagine; every verification in the repo is a test suite, a browser automation or a synthesised PCM stream, and the repo says so repeatedly. The pedagogy in the design (predict before you see, discover at the moment it happens, what-if dials, pretend vs real) matches the evidence base for conceptual change in young children, but it is only pedagogy if the Discovery rule actually fires in generated worlds, which the direction check found it did not for the flagship fixture.

### Cited Findings
Evidence of real use:
- The spec planned "Usability sessions with 3 to 5 children in the age bands run twice" (§15) and "first kid usability session done" as a week-5 exit criterion (§17); `TODO.md:209` still lists "Complete child usability sessions and production policy/release review" as unchecked.
- The direction check names "two child usability sessions" among "External gates that block everything else" — `docs/reviews/2026-10-16-direction-check-summary.md:38`.
- `CHECKPOINT.md` repeats, in every pass, variants of "This is service/PCM evidence, not physical-device listening, native-reader certification or a human-child study" and "Actual-device audio and real-child enjoyment need human acceptance" (lines 31, 118, 128 region).
- The landing was deliberately kept clean: "No invented testimonials, metrics or live-AI claims" — `CHECKPOINT.md:254`.
- `docs/handoff/web-report.md:37`: "No iOS Safari or real microphone verification, child usability session, load/performance budget audit, or production deployment."
- The only "pilot" string in the repo is a Firestore seed reason in a schools plan (`docs/superpowers/plans/2026-10-17-schools-s0-foundations.md:669: reason: 'Pilot school'`).

Learning science alignment:
- Predict-Observe-Explain is designed for topics where "many learners will come to class with strong intuitions about phenomena which are contrary to what actually happens" and the prediction step "helps students become aware of their own preconceptions" — [TU Delft POE page](https://interactivetextbooks.tudelft.nl/showthephysics/Pedagogy/PoE.html). The product's loop (Imagine → Predict → Play → Discover → Remix, spec §3.1) is POE with a remix step.
- Generating a prediction boosts learning through surprise (Brod, Hasselhorn and Bunge 2018, *Learning and Instruction*); the follow-up with 51 children aged 9–12 found a pupillary surprise response to wrong predictions but belief revision only in children with higher executive function, concluding "generating predictions benefits learning – but only among children with sufficient EF capacities to harness surprise for revising their beliefs" — [Brod et al. 2020, Developmental Science](https://www.pedocs.de/volltexte/2021/23315/pdf/Developmental_Science_2020_3_Brod_et_al_Being_proven_wrong_A.pdf), [DIPF PREDICT project](https://www.dipf.de/en/research/projects/predict-prediction-generation-as-a-tool-to-activate-children-s-prior-knowledge-and-improve-learning).
- Developmental trajectory of gravity ideas: between 7 and 9 children move from "things fall because they're not supported" to "because they're heavy"; between 9 and 13 they start using "gravity" with flawed reasoning; qualitative misconceptions persist into college — [AER teacher guide, Learning about Gravity I](https://istardb.org/aerpublications/learning-about-gravity-i-free-fall-a-guide-for-teachers-and-curriculum-developers/).
- Cognitive science models intuitive physics as an internal "intuitive physics engine ... akin to the computer physics engines used for quantitative but approximate simulation" that "differs from ground truth physics in crucial ways" — [Ullman et al. 2017, TICS](https://klab.tch.harvard.edu/academia/classes/BAI/pdfs/UllmanEtAl_TICS2017.pdf).
- Simulation evidence is secondary-level: PhET helped correct mechanics misconceptions in 100 Ghanaian senior-high students (action research) and was "quite effective" for motion/force misconceptions in an Indonesian PBL study; no study tested PhET gravity sims with elementary children — [UEW thesis](https://ir.uew.edu.gh/handle/123456789/5094), [UMPWR article](https://ebook.umpwr.ac.id/radiasi/article/download/6536/2899).
- The "attention span lengthens" claim (README line 3, spec §3.3) has only small, short, task-specific support: 30-minute sessions twice weekly for 12 weeks improved reaction times on a sustained-attention task in at-risk primary children; a 3–4-year-old tablet study found attention "can be sustained but not necessarily gained"; no review or transfer-to-classroom evidence — [Educar 2022](https://educar.uab.cat/article/view/v58-n1-guitart-etal), [Meevee summary](https://meevee.com/blog/digital-games-focus).
- The concept bank is curated and the model personalises one sentence (spec §3.4, §20 "Learning text: curated concept bank"); authored Learning Worlds facts are sourced to CDC, NHS, NIH, MyPlate and NASA with explicit "not to scale / not a diagnosis" disclaimers — `docs/art/learning-content-sources.md`.
- The flagship pedagogy bug: "The flagship jelly dragon cannot earn its Discovery Card. Soft-body lattice bodies carry about 40 percent of their document mass ... so the bounce rule's impulse threshold is never reached" — `docs/reviews/2026-10-16-direction-check-summary.md:17`; later recorded as fixed in `CHECKPOINT.md` ("New physics fixes restore the jelly dragon's bounce Discovery rule").
- Generated-world reliability as of 2026-10-17: "all four full real browser creation attempts produced scene/script work but failed required fox artwork registration/review; end-to-end generated creation acceptance did not pass" (`CHECKPOINT.md:102-118` region) and later "These successes do not establish a general success rate" (`CHECKPOINT.md:23-40` region).

### Inferences
- Impact evidence scores at the floor not because the team is dishonest (they are unusually candid) but because nothing has been done: four weeks is enough to change that from 0 to "small but real".
- Minimum credible evidence gatherable by 2026-11-24: (1) ten to twelve supervised 10-minute sessions with children aged 6–10 (half Bangla-first) using a two-page observation sheet (time to first wish, number of unprompted "why" questions, prediction answered yes/no, Discovery Card read aloud yes/no, whether the child asked to continue); (2) a five-item picture-based pre/post concept check on bounce, gravity and floating with a one-week delayed retest for at least six children; (3) three recorded parent interviews (five questions, ten minutes); (4) one primary school or NGO classroom visit with a signed letter of interest from the head teacher; (5) a native Bangla reader's sign-off on the consent and Discovery Card copy; (6) session telemetry from the ten sessions (median wish-to-world time, Discovery Cards per session, generation failures). Written parental consent for any footage; faces optional.
- Pedagogically, the design's strongest and most defensible claims are (a) prediction before observation, (b) explanation at the moment of the event, (c) manipulable variables (Moon/Jupiter gravity, material) targeting the mass/weight and "heavier falls faster" misconceptions that are documented at exactly ages 7–9, and (d) pretend vs real as an explicit contrast. The Brod 2020 finding is a design instruction: for 6 to 8-year-olds, the character must explicitly connect the surprise to the rule ("You said splat, it bounced, because jelly springs back") rather than rely on surprise alone, which is what the Discovery Card's one-sentence explanation does if it fires.
- Drop the attention-span claim from all judge-facing material; keep the pacing engine as "session structure" without the cognitive claim.

### Gaps
- No RCT or quasi-experimental study of voice-plus-physics-simulation learning in 6 to 10-year-olds was found; the product's pedagogy is well-grounded in principle but unevaluated as a combination.
- No Bangladesh-specific study of children's physics misconceptions in Bangla was found.

---

## Key question 4: Safety and legitimacy. Is a Gemini-based voice product for 6-year-olds allowed, and does the repo answer the questions a Google judge will ask?

### Takeaway
The engineering safety posture is above hackathon average (no raw audio stored, in-memory transcripts, layered moderation, closed DSL, admins never see child names), but the legal posture is unaddressed: Google Cloud's own Service Specific Terms prohibit using Generative AI Services in any application "directed towards or is likely to be accessed by individuals under the age of 18", the Gemini Developer API terms say the same and require 18+ developers, and neither clause is mentioned anywhere in the repo. A Google Cloud business lead will know this clause; the team must walk in with an answer.

### Cited Findings
Google's terms:
- Google Cloud Service Specific Terms, §20(d) Age Restrictions: "Customer will not, and will not allow End Users to, use a Generative AI Service as part of a website, Customer Application, or other online service that is directed towards or is likely to be accessed by individuals under the age of 18." — [cloud.google.com/terms/service-terms](https://cloud.google.com/terms/service-terms).
- Same document, §32(2) on Gemini Live API Custom Voice and Avatar: "Customer will not use any image, audio recording, voice sample, or other data depicting or derived from any individual(s) under the age of 18 with the Custom Voice and Avatar Functionality" — same source. (The repo's photo-to-chibi companion sends a child's photo to an image model, not the Live custom-avatar feature, but it is the same category of data.)
- §20(c) incorporates the Generative AI Prohibited Use Policy into the AUP; that policy's prohibited categories are dangerous/illegal activity, security compromise, sexually explicit/violent/hateful/harmful activity, and misinformation/misrepresentation, including "Impersonating an individual ... in order to deceive" and misrepresenting AI content as human — [policies.google.com/terms/generative-ai/use-policy](https://policies.google.com/terms/generative-ai/use-policy).
- §18 Training Restriction: "Google will not use Customer Data to train or fine-tune any AI/ML models without Customer's prior permission or instruction"; §20(h): Google will not store prompts or generated output outside the customer's account longer than reasonably necessary — [service-terms](https://cloud.google.com/terms/service-terms). This is the data-governance line the pitch should quote in favour of Vertex.
- Gemini API Additional Terms: "You must be 18 years of age or older to use the APIs" and the APIs may not be used in a service "that is directed towards or is likely to be accessed by individuals under the age of 18" — [ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms). Developers asking about adult-operated children's products on Google's forum have no official answer in the thread — [Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-api-age-restriction-for-adult-operated-children-s-product-personalization/185760).
- The repo's local stack runs on a Developer API key: "Put the server-only `GEMINI_API_KEY` in root `.env.local`" (`README.md` "Full local app with Gemini"), while `CLAUDE.md` "Hard rules" says "Every model call goes through Vertex AI in us-central1 with Application Default Credentials. No API keys in the browser, ever" and `CHECKPOINT.md` "Remaining gates" says Vertex model IDs "remain configurable/unverified".
- Google's own under-13 route is the consumer Gemini app under Family Link: parents can grant access, filters "are not perfect", "Hey Google" and Voice Match are disabled for under-13 users, and supervised accounts get no Gemini in the EEA, Switzerland or the UK — [Google support](https://support.google.com/gemini/answer/16109150?hl=en). The education route is Gemini for Education under Workspace for Education terms, reported as now open to under-18 students with data protections and "supports compliance with regulations like FERPA and COPPA" — [Chrome Unboxed](https://chromeunboxed.com/gemini-is-now-available-for-all-education-users-with-extra-safeguards-for-younger-students/); Google's 2024 launch material limited it to "education users 18 years and older" — [Google blog, May 2024](https://blog.google/outreach-initiatives/education/google-ai-gemini-workspace-for-education). Neither route is available to a third-party developer calling the API.

Regulation:
- Amended COPPA Rule: effective 2025-06-23, compliance deadline 2026-04-22 (now passed); personal information now includes biometric identifiers such as voiceprints and face templates, plus audio files containing a child's voice, with a notice requirement describing how audio is handled; the FTC's February 2026 policy statement eases enforcement only for age-verification data and only for operators compliant "in every other respect" — [Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule), [BBB National Programs](https://bbbprograms.org/media/insights/blog/coppa-amended), [Mondaq](https://webiis10.mondaq.com/unitedstates/privacy-protection/1790866/coppas-amended-rule-is-now-in-full-effect-what-operators-need-to-know). Under the 2025 amendments, using a child's data to train AI needs separate verifiable parental consent — [Legal Nodes](https://www.legalnodes.com/article/processing-child-data-ai-apps).
- The FTC opened a 6(b) inquiry in September 2025 into companion-style chatbots at Alphabet, Character.AI, Meta, OpenAI, Snap and xAI, asking "whether and how the firms measure the impact of their chatbots on young users and how they protect against and alert parents to potential risks" — [CNN via KVIA](https://kvia.com/news/business-technology/cnn-business-consumer/2025/09/11/ftc-investigating-ai-companion-chatbots-amid-growing-concern-about-harm-to-kids/).
- Character.AI ended open-ended chat for under-18s on 2025-11-25 after lawsuits, replacing it with video, story and stream creation — [Bloomberg](https://www.bloomberg.com/news/articles/2025-10-29/character-ai-to-ban-children-under-18-from-talking-to-its-chatbots), [getcoai](https://getcoai.com/news/character-ai-bans-users-under-18-from-open-ended-chats-amid-safety-lawsuits). Common Sense Media argues companion apps "should not be available to users under the age of 18" — [CNN via KVIA](https://kvia.com/news/business-technology/cnn-business-consumer/2025/09/11/ftc-investigating-ai-companion-chatbots-amid-growing-concern-about-harm-to-kids/).
- UK Children's Code applies to services "likely to be accessed by children up to age 18" with fifteen standards; the ICO's 2026 priorities are AI and biometrics, the Children's Code and enforcement; a statutory AI code must address children's data — [Verdict](https://www.verdict.co.uk/ico-childrens-code/), [Bratby Law](https://bratby.law/ico-2026-priorities-ai-biometrics-children-enforcement/).
- Bangladesh's Personal Data Protection Ordinance 2025 was gazetted 2025-11-06; processing a child's data requires a parent or guardian's consent and the ordinance "explicitly prohibits profiling, behavioural tracking, or targeted advertising directed at minors" — [Daily Star](https://www.thedailystar.net/tech-startup/news/bangladeshs-personal-data-protection-ordinance-2025-key-takeaways-4015401), [TBS](https://www.tbsnews.net/node/1281356).
- UNICEF's Guidance on AI and Children v3.0 lists ten requirements and was updated specifically to cover "AI companions used by children" — [UNICEF Innocenti](https://www.unicef.org/innocenti/reports/policy-guidance-ai-children).

What the repo already does well:
- Spec §12: no free text from the child, strictest Vertex safety settings, prompt policy, inline transcript moderation, DSL category allowlist, image safety check, no raw audio, transcripts discarded at session end, profiles hold first name/avatar/age band only, US-region data, kill switch — `docs/superpowers/specs/2026-10-15-just-imagine-design.md` §12.
- "Jobs use an age/tier/concept brief rather than raw transcript excerpts. Operational logs omit child text/tokens/provider messages" and "Live moderation outages fail closed as operational errors, not child safety strikes" — `CHECKPOINT.md` "Important decisions".
- Admins "never see child names, photos, generated chibi art, transcripts or world content beyond titles"; the moderation log stores category and session id, "never the transcript text" — quality programme §9b.
- Consent is a checkbox: "I am a parent or guardian and consent to creating this family account and processing my child's play data as described in the privacy policy" (`apps/web/lib/strings/en.ts:46`); the spec calls this "a product control, not legal advice" (§11).
- The privacy page ends with "Production policies and service configuration must be reviewed before release" and discloses that a child's photo is "sent to Gemini to create a chibi avatar" with metadata removed and the original not saved — `apps/web/app/privacy/page.tsx`, `en.ts` `privacyBody`.

### Inferences
- "Are you even allowed to do this?" currently has no answer in the repo, and the honest answer today is: not under the standard Google Cloud terms. The viable framings for the submission are (a) explicitly position the build as a research prototype submitted to Google with a request for a children's-use agreement, citing §20(d) by number and showing the controls that would satisfy it; (b) propose the schools line through Workspace for Education / Gemini for Education, which is the only Google channel that currently reaches under-18s with COPPA/FERPA language; (c) show a credible path to a non-Gemini voice fallback. Judges reward teams who know the rule and have a plan over teams who did not read it.
- The consent model is not verifiable parental consent in the COPPA sense (checkbox at sign-up, no verification); for a hackathon this is acceptable if named as such, but the pitch must not say "COPPA compliant". The voice stream is a biometric under the 2025 rule even if never stored; the notice must say how audio is handled (the privacy page does, in one sentence).
- Pets, points thresholds and class/school leaderboards (schools spec D7) are exactly the "nudge" and profiling patterns that the UK code and the Bangladesh ordinance scrutinise; keep them server-side, non-comparative for the family product, and absent from the demo.
- The photo-to-chibi feature is the single highest-risk surface (child facial image to a model, biometric under COPPA 2025, §32-adjacent under Google's terms) for the least pitch value. Remove it from the demo and consider removing it from the build before submission.
- Positives to say out loud: one voice session at a time, no open-ended companionship (every conversation is anchored to a world and a concept), parent sees every session summary, no raw audio, transcripts die with the session, the model never gets the child's transcript for world building. That is a stronger answer to the FTC/Character.AI climate than most "AI friend" products can give.

### Gaps
- Whether Google grants written exceptions to §20(d) for vetted children's products was not found in any public source; the forum threads have no official reply.
- The exact Gemini for Education age policy as of October 2026 could not be confirmed from Google's own current page (sources conflict: 2024 Google material says 18+, 2025–26 coverage says under-18 with protections).
- The ordinance text of Bangladesh's PDPO 2025 (penalty amounts, commencement) was not retrieved; findings rely on press and law-firm summaries.

---

## Key question 5: Business. Pricing vs market, willingness to pay, unit economics, go-to-market, defensibility, why Google Cloud

### Takeaway
At Google's current list prices a typical 10-minute session costs roughly US$0.55 to US$1.20 in model calls and an active child at 20 sessions a month costs US$11 to US$24, against a Family plan of US$9.99 for up to four children; the plan's own quota ceilings expose a family to over US$300 a month of model spend. Stripe does not onboard Bangladesh-registered businesses, there is no local price, and the schools line is unbilled, so there is no coherent revenue path yet. The defensible assets are the validated Scene DSL pipeline, the sandboxed game runtime and the Bangla voice cast.

### Cited Findings
Pricing in the spec and code:
- Plans: Free = 1 child, 15 voice minutes/day, 3 worlds/day, 8 images/world; Family = 4 children, 60 voice minutes/day, 20 worlds/day, 16 images/world, "USD 9.99 per month with a 7-day trial; local currency pricing comes after submission" — spec §11; `packages/protocol/src/plans.ts:18-26`.
- Billing is Stripe Checkout and Customer Portal only (`services/api/src/billing.ts`); the deployment runbook step 5 is "Create the $9.99/month Family price" — `docs/runbooks/deployment.md`.
- Stripe's supported-country list does not include Bangladesh; a Bangladesh founder needs a legal entity in a supported country such as the UK, US or Singapore — [WorldFirst](https://www.worldfirst.com/sasia/blog/business-banking-insights/stripe-guide-south-asia/), [Dodo Payments](https://dodopayments.com/blogs/stripe-supported-countries-alternatives).
- The admin Overview page already includes "an estimated model cost per day from usage counters" — quality programme §9b. That is the right instinct and should be surfaced in the pitch.

Model prices (Google, paid tier, last updated 2026-10-16 — [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing); Vertex lists the same Live rates per the search summary of [cloud.google.com/vertex-ai/generative-ai/pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)):
- `gemini-3.8-live`: audio input $3.00/1M tokens ($0.005/min); audio output $12.00/1M ($0.018/min); text input $0.75/1M; text output $4.50/1M. Audio is 25 tokens per second.
- `gemini-4-argon`: input $2.00/1M, output $10.00/1M "including thinking tokens"; both double on 2026-12-01 ($4.00 / $20.00). Implicit caching only.
- `gemini-3.8-flash`: input $0.75/1M, output $3.75/1M (including thinking); doubles 2027-01-01.
- `gemini-nano-banana-2.1`: $30/1M image tokens, about $0.0336 per 1K image and $0.0504 per 2K image. `gemini-3.1-flash-lite-image`: $0.0336 per 1K image. `gemini-3-pro-image`: $0.134 per 1K/2K image.
- `gemini-3.8-flash-tts`: $0.50/1M text in, $9.00/1M audio out ($0.00225 per 10 s); doubles 2027-01-01.
- `lyria-3-clip-preview`: $0.04 per 30 s clip.

Competitor price points:
- Khanmigo family plan: $4/month or $44/year, parent account activates Khanmigo for up to 10 children, with chat history and safety alerts; a district page lists it for grades 5–12 — [khanmigo.ai/pricing](https://khanmigo.ai/pricing), [Khanmigo for parents](https://www.khanmigo.ai/parents), [Munster schools](https://mhs.munsterschools.gov/parent-student-resources/khanmigo). No product called "Khanmigo Kids" was found in any search.
- Ello: $24.99/month for five physical books a month plus the AI reading coach (K–3), $12.49 per additional child, tablet-only at launch; $15M Series A (2023), over $20M total — [TechCrunch](https://techcrunch.com/2023/09/07/ai-reading-coach-startup-ello-raises-15-million-to-bolster-child-literacy), [Maginative](https://www.maginative.com/article/ello-raises-15-million-to-teach-children-to-read-using-ai/).
- Minecraft Education: about $5.04 per user per year for schools, $12 per user per year for camps and clubs, bundled free in Microsoft 365 A3/A5 — [minecraft.net/licensing](https://new.minecraft.net/licensing), [Minecraft Education FAQ](https://edusupport.minecraft.net/hc/en-us/articles/360047119092).
- Toca Boca World: free download with in-app purchases of $1.99–$2.99 (March 2026 snapshot) and a "Toca Days" subscription around $5.99/month — [App Pricing Lab](https://apppricinglab.com/iap/apple/1208138685), [Subger](https://subger.com/en/nz/service/toca-boca-world) (weak source).
- 10 Minute School: 3.2 million monthly active learners, over 650,000 paid users, $5.5M pre-Series A (2023); both it and Shikho say they charge 75–80 percent less than private tuition, about Tk 20,000–25,000 a year for an SSC/HSC student (2022) — [Future Startup](https://futurestartup.com/2023/10/12/10-minute-school-raises-5-5mn-in-pre-series-a-to-take-high-quality-and-affordable-education-to-millions-of-students-nationwide/), [TBS](https://www.tbsnews.net/tech/bangladesh-set-edtech-revolution-360985). Shikho reports 2.5 million registered users and says rural users "engage far less" because of internet pricing — [Financial Express op-ed by Shikho](https://thefinancialexpress.com.bd/views/columns/lowering-data-price-to-widen-internet-use).
- Curio AI plush toys: $99 including a 60-day "Curio Plus" subscription required for unlimited conversation; transcripts stored 90 days — [Freethink](https://www.freethink.com/robots-ai/ai-toy-grok), [Spielwarenmesse](https://www.spielwarenmesse.de/en/mag/toy-market-news/ai-toys-monitor-children-with-technology-from-microsoft-openai-and-epic-games).

### Inferences
Cost per 10-minute session (assumptions stated; see the cost section below for the arithmetic): low case about $0.55 (one playground world, cached art), typical about $0.90–$1.20 (two worlds, one a generated game, three live images), high about $2.30 (eight props, a repair retry, re-billed Live context). Per active child at 20 sessions/month: about $11 / $18–24 / $46. The Family plan at $9.99 for up to four children is underwater with a single active child at typical usage, before Stripe fees, Cloud Run, Firestore and CDN. Quota ceilings are worse: Family's 60 min/day and 20 worlds/day allow roughly $22 of Live audio plus $300 of world builds per month; Free's 15 min and 3 worlds/day allow about $50 of spend per month per non-paying user. On 2026-12-01 Argon doubles, which moves the typical session to about $1.30–$1.60.
- Levers that fix this and should be in the pitch: library-composed worlds with at most one live hero sprite (quality programme §2) cut image cost by 70–90 percent; Flash instead of Argon for playground worlds (the spec's own fallback) cuts the DSL cost by about 75 percent; per-day world caps of 3–5 rather than 20; a quota on generated-game scripts (they are the Argon-heavy path); asset cache hits (spec §9.4). With those, a typical session falls to roughly $0.25–$0.40 and a 20-session child to $5–$8, which a $9.99 single-child plan or a Tk 300–500 monthly plan can carry.
- Pricing for Bangladesh should be stated in Taka with mobile-money rails (bKash, Nagad, SSLCommerz) and a per-child price in the Tk 200–500/month band that the local edtech market has trained parents to pay for (Tk 20–25k/year for a whole SSC year of tuition replacement is the anchor). Keep the USD plan for the diaspora and the global parent, which is also the Stripe-eligible market if the company is domiciled abroad.
- Go-to-market options ranked by credibility for a judge: (1) schools and NGOs through a Gemini for Education-aligned path, because it is the only channel where Google itself serves under-18s and where Bangladesh's rote-learning problem lives; (2) Bangla-speaking diaspora parents on iPad/Android in the UK, US, Gulf and Malaysia, who pay in USD/GBP and are Stripe-reachable; (3) domestic parents via app stores and bKash last, because willingness to pay for a 6-year-old's play app is unproven and data cost is the binding constraint.
- Defensibility is not the UI or the cast; it is the contract-first pipeline (voice → brief → Zod-validated Scene DSL → deterministic physics validator → engine), the sandboxed game runtime with a headless acceptance gate, and the bilingual prompt and content discipline. These are hard to copy quickly and are exactly what a Google Cloud judge values.
- Why Google Cloud specifically, said well: one vendor for live voice, structured world generation, image generation, TTS and music; Vertex's contractual promise not to train on customer data (§18) and not to retain prompts (§20(h)); Firestore realtime delivery of worlds; Cloud Run WebSockets with session affinity; Secret Manager and ADC meaning no keys in the browser. Said badly: a list of model IDs.

### Gaps
- Live API context billing: whether the Live API re-bills accumulated session context on every model turn (as multi-turn text calls do) could not be confirmed from the pricing page; the estimate carries this as a range.
- Current 2026 prices for Ello, Toca Boca and 10 Minute School course batches were not confirmed from primary pages; the figures above are 2023–2026 secondary sources.
- No data on Bangladeshi parents' willingness to pay for a pre-primary/primary digital product was found.

---

## Key question 6: Demo narrative. The strongest 3-minute video and 5-minute live demo, and where the product is fragile

### Takeaway
The product has a genuine "wow" (a child's Bangla sentence becomes a painted, physically honest world that a character then explains, and a Moon dial makes the same world behave differently), but the current build would make that moment fragile at five points: wish-to-world latency and art-registration failures, voice off by default behind a three-step auth path, placeholder silhouettes when images fail, unverified Bangla voice quality on a real device, and no public URL for judges to touch.

### Cited Findings
Fragility evidence from the repo:
- Latency budgets in the spec: DSL under 6 s, placeholders under 3 s, hero sprite under 10 s, world ready under 25 s (spec §9.6); game scripts "add six to eight seconds on gemini-4-argon" (quality programme §6); assets "stop being scheduled after 25 seconds, leaving later requested characters without their illustrations" (`docs/handoff/planet-characters-upgrade.md`); a long story book "takes several minutes" and a first uncached Bangla translation batch took 47,350 ms (`docs/handoff/story-stage-operations.md`, `CHECKPOINT.md` Bangla checkpoint).
- Art reliability: "all four full real browser creation attempts ... failed required fox artwork registration/review" and "One intervening clear scene failed native art layout on both attempts"; "These successes do not establish a general success rate" — `CHECKPOINT.md`.
- Voice is off by default: "Voice is off until the child asks for it. Entering the Studio opens no Live session and shows no mic ring; the stage says 'Tap a friend to start'" — quality programme §7a; strings `tapFriend`, `tapFriendHint` in `en.ts`.
- Auth path for the real app: parent sign-in with `parent@justimagine.test`, choose Ari, permit the microphone, then speak — `docs/handoff/local-development.md`. iOS needs a user gesture to start audio; the profile tap is that gesture (spec §7.3).
- Characters are authored SVGs with mouth openings, not Rive rigs; reaction clips and Rive files are "assets/polish work" still outstanding — `CHECKPOINT.md` "Remaining gates" item 4; the quality programme's own words: "full Rive rigs for the six characters" out of scope (§11).
- Cloud: "No cloud resources have been created by this implementation session" and "No cloud deployment or production release is implied" — `docs/runbooks/deployment.md`, `README.md` "Status". The spec's own competition requirement is "Functional prototype deployed on Google Cloud (Cloud Run or Firebase)" (§2).
- A recent Google Cloud hackathon (Agentic Cinema) required "a hosted project URL and a 3-minute video demonstrating functionality" and judged "technical implementation, product design, potential impact, and idea quality" — [EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/google-cloud-opens-75000-agentic-cinema-hackathon-for-gemini-powered-media-tools), [st-hakky summary](https://book.st-hakky.com/en/news/google-cloud-agentic-cinema-hackathon).
- Sound exists (40 synthesised cues, music beds ducked under speech) — `docs/art/sound-provenance.md`, commit `8f4bc43`. The generation show has scripted lines for every wait ("Got it! Let me grab my brush...", "Painting the sky and the ground...", "Ta-da!", and the late fallback "My paint spilled! Want to pick a world instead?") — `en.ts` `show.*`.
- Audio crackle was investigated and repaired, but "Verify updated sound on the user's actual speakers/headphones" is unchecked — `TODO.md` "Creative freedom follow-up".

### Inferences
Recommended 3-minute video (one child, one wish, one world, one surprise, one learning moment, one parent view):
- 0:00–0:15 Problem card over a real Dhaka classroom photo (licensed or the team's own): "Half of Bangladesh's grade-3 children miss the maths bar. Science is memorised, not touched. No AI speaks to a six-year-old in Bangla." One line of source text on screen (NSA 2022, World Bank).
- 0:15–0:35 A real child (consented, can be filmed from behind or hands only) taps Bhombol on a phone or tablet and says in Bangla: "একটা জেলি ড্রাগন যে মেঘের উপর থাকে" ("a jelly dragon that lives on a cloud"). English captions. Bhombol repeats it back in Bangla and asks one shaping question. Show the mic ring and "শুনছি" chip.
- 0:35–0:55 Chandni's prediction card: "বাউন্স না স্প্ল্যাট?" The child taps "splat". The generation show runs: brush out, sky paints in, cloud settles, "Drawing your dragon... this is the best part". No spinner visible at any point.
- 0:55–1:25 Reveal. The child flicks the dragon off the cloud; it wobbles and bounces; the `boing` cue; confetti; Bhombol: "Boing! Jelly squishes and springs back. That's bounciness!" The Discovery Card unlocks with the "in real life" line. Caption: "Prediction: splat. Reality: bounce. That gap is where learning happens" (one line citing POE/Brod on screen is optional).
- 1:25–1:50 The surprise: the child turns the gravity dial to Moon. Same dragon, slow float, Bhombol explains in one sentence. Then "Jupiter": thud. One sentence. This is the moment that sells "physics-respecting".
- 1:50–2:10 Pretend mode: the child asks for "a stone that floats". The validator marks it pretend; Mishti says "In real life stones sink, but in our world we're pretending. Want to see what really happens?" Tap: the stone drops. This is the single best 20 seconds of safety-plus-pedagogy the product has.
- 2:10–2:30 Parent view on a phone: today's session summary in Bangla, minutes, the two Discovery Cards, the saved world thumbnail. One sentence: "Parents see the summary, never the audio. Nothing of the child's voice is stored."
- 2:30–2:50 Architecture card, ten seconds, no narration beyond one sentence: browser → Cloud Run gateway holding one Gemini Live session → builder on Cloud Run producing a Zod-validated Scene DSL → Firestore → PixiJS/Rapier. Show the Vertex model names once.
- 2:50–3:00 Ask: "Built in Dhaka for Bangla-speaking children first. We are asking Google for a children's-use path for Gemini so we can pilot with two schools in January." End card with the hosted URL.

Recommended 5-minute live demo plan:
- Setup before the judges arrive: signed in, Ari selected, microphone permission granted, Bhombol session already open and muted so the first tap is instant; a second laptop on the fixture preview (port 3200) with the same worlds as the fallback; a pre-generated gallery containing the jelly dragon, a Moon world, one child-created planet character world and one generated game; language set to Bangla with English captions on.
- 0:00–0:30 One sentence of problem, then hand the device to a judge and ask them to say any wish (in English is fine; the system is pinned to the child's language, so set the demo profile to English for a non-Bangla judge, or keep Bangla and let the team's child speak).
- 0:30–2:00 Live generation with the show playing; while it paints, talk about the DSL and the validator ("the model cannot emit anything the engine cannot render"). If the world is late, the character's own 25-second fallback offers a library world; take it without apology.
- 2:00–3:00 Flick, Discovery Card, Moon dial, Jupiter dial. Hand the judge the dial.
- 3:00–3:45 Open the pre-built planet world: tap Saturn, she "comes closer", the judge asks her one question by voice, she answers in character and asks one back. Thirty seconds, no more.
- 3:45–4:30 Parent dashboard on a phone; then the admin safety log for ten seconds ("categories, never transcripts").
- 4:30–5:00 Close on the §20(d) answer and the January pilot. Do not open Labs, stories, pets, companion setup, billing or schools unless asked.

Where the wow is at risk and the mitigation that costs the least: pre-warm the Live session; cache every demo wish's assets so the "live" generation is a cache hit with a real DSL call (honest: the DSL and physics are live, the art is cached; say so if asked); keep the generation show under 12 seconds in rehearsal; rehearse the "paint spilled" fallback as a feature; test Bangla voice on the actual device speaker in a noisy room; have the 3200 fixture laptop open; deploy to Cloud Run so the URL on the end card works.

### Gaps
- The identity of the specific late-November 2026 Google hackathon and its judging rubric could not be found; the Agentic Cinema rubric (technical implementation, product design, potential impact, idea quality; hosted URL plus 3-minute video) is the closest 2026 Google Cloud reference.
- No measured wish-to-world p50 on the real stack is recorded anywhere in the repo; the demo plan above assumes 10–25 s from the spec budgets.

---

## Key question 7: Documentation honesty. Overstated and under-sold claims

### Takeaway
The working documents (CHECKPOINT, TODO, handoffs, reviews) are unusually honest, repeatedly refusing to claim production readiness, child acceptance or cloud deployment; the judge-facing documents (README line 1, spec §1, landing copy, CLAUDE.md) make aspirational claims a judge can falsify in five minutes. The team under-sells its best assets: the safety architecture, the deterministic validator, the sandboxed game gate and the bilingual discipline.

### Cited Findings
Overstated or falsifiable claims:
- "physics-respecting 2.5D world" and "Every world teaches the real physics" (`README.md:3`): the engine "still lacks the spec's explicit buoyant-flag behavior and automatic splitting for breakable materials" (`CHECKPOINT.md` Remaining gates item 4; `TODO.md` "Implement explicit buoyant-flag behavior"), the flagship Discovery rule did not fire until fixed (`docs/reviews/2026-10-16-direction-check-summary.md:17`), and generated worlds have no measured success rate.
- "the session structure gradually lengthens attention span" (`README.md:3`, spec §3.3): no evidence in the repo; external evidence is small and task-specific (see Key question 3).
- "The system is production grade" and "deployed on Google Cloud" as success criteria (spec §1): "No cloud resources have been created" (`docs/runbooks/deployment.md`); "Do not infer production readiness from completed source checkboxes" (`TODO.md`).
- "Disney and Pixar inspired 2D painterly cartoon" (spec §3.2) and "realistic-cartoon, Disney-inspired" (`CLAUDE.md`): the cast is six refined SVGs with "separate voice-driven mouth openings" and eight-pose sprite sheets; "do not claim film-quality animation" (`TODO.md` "Current learning-worlds and craft pass"); "This pass ships predefined sprite acting, not continuous rigs" (`TODO.md`).
- "Two programmers: Dev A (Experience), Dev B (Platform and AI)" (spec header) vs one committer in `git shortlog` and a "Parallel teammate ledger" of Claude Code and Codex session notes in `CHECKPOINT.md:308-340`.
- "Every model call goes through Vertex AI ... No API keys" (`CLAUDE.md` Hard rules) vs `GEMINI_API_KEY` in `.env.local` for the only stack that has ever produced a real world (`README.md`, `docs/handoff/local-development.md`), and "Model IDs ... remain configurable/unverified" (`CHECKPOINT.md`).
- "children aged 6 to 10 ... Pip the kitten, Bolt the puppy, Luna the cat" (`CLAUDE.md`) vs 6 to 13 and Mishti/Bhombol/Chandni everywhere else; the demo companion is literally named "Pip" (`docs/handoff/local-development.md`).
- "Nobody types free text" (spec §2) vs the Studio's "Say it or write it" authoring box (`en.ts` `creation.help`) and the schools spec's typed tutor (D9).
- "Characters ... Bengali children's favourites" vs the Bangla review's "No native reader's approval is recorded here" (`docs/i18n/bangla-review.md`).
- Animal recordings "were picked automatically and nobody has listened to them yet" (`docs/art/animal-sounds-provenance.md`) while the Learn strings promise "Hear my real call".

Under-sold assets:
- The deterministic physics validator with structured issues, material plausibility table and pretend marking (spec §5.4) is described in one paragraph and never in the README's "How it works" beyond one clause.
- The generated-game acceptance gate ("Every positive effect must depend on its own input prefix; idle/prefix crashes reject the programme", `CHECKPOINT.md` Argon checkpoint; `services/builder/src/game-playtest.ts`) is a research-grade idea and is invisible to a judge.
- The privacy architecture (no raw audio, in-memory transcripts, briefs instead of transcripts for builders, admins never see child names, moderation log without text, fail-closed moderation) is scattered across §12, §9b and CHECKPOINT decisions, and the privacy page says "Production policies ... must be reviewed before release" instead of stating these controls plainly.
- The sourced, disclaimed Learning Worlds content (`docs/art/learning-content-sources.md`) and the CC0 provenance table are exactly what an impact judge wants and are not surfaced.
- The honest fallbacks ("My paint spilled! Want to pick a world instead?", "The game got tangled") are a feature and should be shown as one.

### Inferences
- Rewrite the README's first paragraph as a problem statement plus one honest capability sentence, move all "will" claims into a roadmap section, and reconcile CLAUDE.md with the spec. Judges forgive scope that is labelled; they punish the first overstatement they catch.
- Replace "production grade" with the specific numbers the repo can defend (test counts per package, emulator coverage, deterministic replay, moderation fail-closed) and replace "deployed" with a real Cloud Run URL or nothing.

### Gaps
- Whether the "demo-2026-10-16" tag or any build has been pushed to a public GitHub repository readable by judges could not be determined from the working tree (origin is `github.com/mubinui/just-imagine`; the spec says the repository is "private until submission").

---

## Key question 8: Team and storytelling. What the repo reveals about process and what the pitch should say

### Takeaway
The repository is a candid record of one human directing two AI agents through a spec-first, contract-first, review-gated workflow at extraordinary speed; told well, that is a compelling Google-AI-hackathon story, but told by accident (session ledgers, "Dev A/Dev B", 60k lines in three days) it reads as generated bulk.

### Cited Findings
- 28 commits on the branch, all by `mubinui`, from 2026-10-15 to 2026-10-17 (`git log --format='%h %ad %an %s'`); about 59,855 lines of TS/TSX.
- The quality programme names the team as "Dev A (experience), Dev B (platform and AI), two AI implementers (Claude Code, Codex) working under these plans" — `docs/superpowers/specs/2026-10-16-quality-program-design.md` header.
- `CHECKPOINT.md` contains "Parallel session notes (Claude Code, 2026-10-15 23:55)" through "(2026-10-16 00:21) — review findings for Codex", and `docs/handoff/schools-collaboration.md` records "Claude: implementation; Codex: review and integration".
- Process artefacts a judge can verify: four read-only direction-check reviews with file:line findings and completion percentages (`docs/reviews/2026-10-16-*.md`), a 344-test baseline rising to 400+ with emulator-backed integration tests (`CHECKPOINT.md`), Impeccable design reviews with "ship at scope" verdicts, provenance sidecars for every raster and sound (`docs/art/*`), and the CLAUDE.md workflow (brainstorm → grill → plan → TDD → verify → review).
- The honesty discipline is explicit and repeated: "No invented testimonials, metrics or live-AI claims"; "Those failed commands are not passes"; "No test assertion was weakened" — `CHECKPOINT.md`.

### Inferences
- The pitch line that works: "One founder in Dhaka, two AI engineers, a 767-line spec written before the first line of code, every boundary a Zod contract, every claim verified before it was written down." Show the review documents, not the line count.
- Remove "two programmers" from the spec header before submission or explain it; a judge who finds one committer after reading "Dev A/Dev B" will discount everything else.
- Move the agent session ledger out of `CHECKPOINT.md` into `docs/handoff/checkpoint-history-*.md` (the pattern already exists) so the first file a judge opens after README is a one-page status, not a transcript of agent coordination.

### Gaps
- Whether a second human developer exists off-repo (the spec's Dev A/Dev B) could not be determined; git shows one author.

---

## Scorecard (1–10, as the three non-engineering judges would score today)

### Takeaway
Average 4.0 today. Winner level for this panel is 7+ on every row; the gaps are concentrated in evidence, legitimacy and business, all of which are fixable in four weeks with product discipline rather than more code.

### Cited Findings

| Dimension | Score | Justification (evidence above) |
|---|---|---|
| Problem clarity | 3 | No problem sentence anywhere (`README.md:3`, spec §1, `page.tsx`); payer split across two specs; Bangladesh evidence (NSA 2022, rote learning, device data) exists publicly but is uncited. |
| Focus | 2 | 24 surfaces, two product lines, 11 workstreams in `TODO.md`, three days of commits; CLAUDE.md and README disagree on age band and cast. |
| Innovation | 7 | Voice → validated Scene DSL → real physics with pretend mode; sandboxed generated game scripts with a headless acceptance gate; Bangla voice cast; callable authored characters. No competitor below does imagination-to-physics-world by voice for 6 to 10-year-olds. Points lost for unproven generated-art reliability and SVG-not-Rive characters. |
| Impact evidence | 1 | Zero children, parents or teachers; usability sessions planned and unchecked (`TODO.md:209`); only synthetic PCM and browser tests. |
| Safety and legitimacy | 3 | Strong controls (spec §12, §9b, CHECKPOINT decisions) but Google Cloud §20(d) and the Gemini API 18+ terms are unaddressed; consent is a checkbox; local stack uses a Developer API key; photo-to-chibi processes a child's face; Bangladesh PDPO and COPPA 2025 biometric scope unmentioned. |
| Business viability | 3 | $9.99 for four children vs $11–24 model cost per active child; quota ceilings allow $300+/month exposure; Stripe unavailable to Bangladesh entities; no Taka price; schools unbilled; admin cost telemetry is the one bright spot. |
| Demo wow factor | 4 (potential 8) | The moment exists (wish → painted world → prediction gap → Moon dial → pretend vs real) but is fragile: 10–25 s builds, 4/4 art failures in one pass, voice off by default behind sign-in, SVG cast, no hosted URL, unverified device audio. |
| Documentation honesty | 7 | CHECKPOINT/TODO/handoffs are exemplary; README/spec/CLAUDE.md overstate ("production grade", "deployed", "lengthens attention span", "two programmers", "Disney-inspired"). |

### Inferences
- The two lowest rows (impact evidence, focus) are the two cheapest to raise and the two that most change how the other six are read.

### Gaps
- Scores assume the typical 2026 Google Cloud hackathon rubric (technical implementation, product design, potential impact, idea quality); if the actual event weights "use of Google Cloud services" heavily, the missing deployment counts even more.

---

## Competitive table

### Takeaway
Nothing in the market combines live voice, imagination-to-world generation and honest physics for 6 to 10-year-olds, and nothing does it in Bangla; the closest products either avoid open-ended AI for young children entirely (Read Along, Toca Boca, Minecraft Education) or are retreating from it under regulatory pressure (Character.AI), which is both the opportunity and the warning.

### Cited Findings

| Product | Audience | What it does | Pricing | Child-safety approach | Just Imagine better / worse |
|---|---|---|---|---|---|
| Khanmigo (family plan) | Grades 5–12 (ages ~10–18) | Socratic text tutor across Khan Academy content | $4/month or $44/year, up to 10 children per parent — [khanmigo.ai/pricing](https://khanmigo.ai/pricing) | Parent account, chat history visible to parents, safety alerts; parents can switch it on/off per child — [Khanmigo for parents](https://www.khanmigo.ai/parents) | Better: voice, play, ages 6–10, Bangla, simulation not text. Worse: price anchor is $4 for ten kids; Khan has content depth and school trust. "Khanmigo Kids" does not exist, so the under-10 space is open. |
| Ello | K–3 readers | Voice AI reading coach that listens to a child read physical books | $24.99/month for five books + coach, $12.49 per extra child (2023) — [TechCrunch](https://techcrunch.com/2023/09/07/ai-reading-coach-startup-ello-raises-15-million-to-bolster-child-literacy) | Narrow task (reading), tablet-only, no open chat | Better: open imagination, physics, bilingual. Worse: Ello has $20M+ funding, a tight single use case and evidence from classrooms; JI has none. Ello proves parents pay $25/month for a voice AI with a clear literacy outcome. |
| Roblox Cube / Roblox | 5–17+, 123M DAU, about three-quarters of age-checked users under 18 (Aug 2026 report via [Annielytics timeline](https://www.annielytics.com/tools/ai-timeline/company/roblox/)) | Text-to-3D generation inside Roblox experiences — [Roblox newsroom](https://corp.roblox.com/newsroom/2025/03/introducing-roblox-cube) | Free platform, Robux economy | Age checks, Sentinel grooming detection, under-13 chat restrictions, parental permission for DMs — [Bristows](https://inquisitiveminds.bristows.com/post/102k7og/not-childs-play-ai-and-online-safety-for-roblox) | Better: no multiplayer, no strangers, no economy, physics is the point. Worse: Roblox owns "kids make worlds"; JI must say "no social, no marketplace" out loud. |
| Toca Boca World | 6–12 | Open-ended dollhouse play, no AI, no physics teaching | Free with $1.99–$2.99 IAP; "Toca Days" sub about $5.99/month — [App Pricing Lab](https://apppricinglab.com/iap/apple/1208138685) | No chat, no accounts, offline | Better: learning layer, voice, generation. Worse: Toca sets the bar for charm and zero-friction play; JI's cast and juice are not there yet. Toca's price is the parent's mental anchor for "play app". |
| Minecraft Education | Schools, 6–18 | Sandbox with lesson packs and physics-lite building | $5.04/user/year schools, $12 orgs, bundled in M365 A3/A5 — [minecraft.net/licensing](https://new.minecraft.net/licensing) | School-managed identity, no public chat | Better: real physics, voice, Bangla. Worse: $5/seat/year is the school price ceiling JI's schools line must live under; Minecraft has a decade of teacher content. |
| Google Read Along | 5+, nine languages | On-device speech recognition reading practice with "Diya"; classroom version with Gemini-era pilots — [VentureBeat](https://venturebeat.com/ai/googles-read-along-taps-ai-to-improve-kids-reading-skills), [TechCrunch](https://techcrunch.com/?p=2799552) | Free | Offline after download, "no data is sent to its servers, and no account is needed" | Better: generative, physics, Bangla voice conversation. Worse: Google's own children's product deliberately keeps speech on-device and account-free; a Google judge will compare JI's server-held Live session to that design. |
| Gemini app for under-13 (Family Link) | Under-13 with supervised accounts, outside EEA/UK/CH | General Gemini with filters | Free | Parent-granted via Family Link, Keep Activity off, no Voice Match; "filters ... are not perfect" — [Google support](https://support.google.com/gemini/answer/16109150?hl=en) | Better: bounded to a world and a concept, never open-ended. Worse: Google reaches under-13s only through its own app and consent surface, not through third-party API users (see §20(d)). |
| Character.AI | Formerly 13+/16+; open-ended chat for under-18s ended 2025-11-25 — [Bloomberg](https://www.bloomberg.com/news/articles/2025-10-29/character-ai-to-ban-children-under-18-from-talking-to-its-chatbots) | Companion chatbots | Freemium | Age verification, two-hour caps then ban for minors, after lawsuits and the FTC 6(b) inquiry | Better: no open-ended companionship; every conversation is anchored and parent-visible. Worse: the category "AI friend for kids" is now politically toxic; JI must not use the word "companion" in the pitch. |
| Curio (Grok/Grem/Gabbo plush) | 3–12 | Voice AI toy | $99 + subscription for unlimited talk — [Freethink](https://www.freethink.com/robots-ai/ai-toy-grok) | Transcripts stored 90 days and analysed; criticised for missing filter disclosure — [Spielwarenmesse](https://www.spielwarenmesse.de/en/mag/toy-market-news/ai-toys-monitor-children-with-technology-from-microsoft-openai-and-epic-games) | Better: no transcript retention, learning anchor. Worse: proves parents will pay ~$100 upfront for a voice character; JI has no hardware story. |
| Miko Mini | 5–10 | Educational robot with parent app | Not found in sources | Physical camera privacy button, parent monitoring — [getcoai](https://getcoai.com/news/ai-robot-miko-mini-might-teach-your-kids-a-thing-or-two) | Comparable parent-visibility model; JI's dashboard should match its clarity. |
| 10 Minute School | Classes 6–12, SSC/HSC | Video courses and batches in Bangla | Tk 20–25k/year anchor (2022); 650k paid, 3.2M MAU (2023) — [Future Startup](https://futurestartup.com/2023/10/12/10-minute-school-raises-5-5mn-in-pre-series-a-to-take-high-quality-and-affordable-education-to-millions-of-students-nationwide/) | Exam content, no AI companion | Better: ages 6–10, play, voice. Worse: owns Bangla edtech distribution and parent trust; the natural partner or acquirer for the schools line, not a competitor at age 6. |
| Shikho | Classes 6–12 | Bangla video + practice | 2.5M registered; rural engagement limited by data price — [Financial Express](https://thefinancialexpress.com.bd/views/columns/lowering-data-price-to-widen-internet-use) | Exam content | Same as above; also evidence that data cost, not content, limits reach. |
| Sisimpur (Sesame Workshop) | 3–8 | Bangla character-led TV and app learning | Free (broadcast); ~10M children reached, 90M YouTube views — [Daily Star](https://www.thedailystar.net/arts-entertainment/news/sisimpur-air-seven-days-week-btv-1967789) | Broadcast, no interaction | Better: interactive, generative, physics. Worse: Sisimpur has 20 years of research-backed impact in exactly JI's language and age band; it is the obvious impact partner and the standard for Bangla character design. |

### Inferences
- The positioning that survives this table: "Not an AI friend. A Bangla-speaking physics playground where a six-year-old's own idea becomes the experiment." Lead with the learning anchor, the parent window and the no-open-chat design.
- Price anchors a parent judge carries: Khanmigo $4, Toca $6, Minecraft $5/seat/year, Ello $25 with physical books. $9.99 for four children is defensible only for a US/UK/diaspora parent and only after costs are fixed.

### Gaps
- No Bangla-language AI product for children under 10 was found in any search; the "rare" claim appears to be "unique" but could not be proven as a negative.

---

## Cost per session estimate

### Takeaway
A 10-minute session with two worlds costs about $0.90–$1.20 at today's list prices (range $0.55–$2.30), or $18–$24 per active child per month at 20 sessions; after 2026-12-01 Argon doubles and the typical session rises to about $1.30–$1.60. The spec's library-first art, Flash-for-playground fallback and tighter daily caps bring a typical session to roughly $0.25–$0.40.

### Cited Findings
All unit prices from [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) (last updated 2026-10-16; Vertex lists identical Live rates per [cloud.google.com/vertex-ai/generative-ai/pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)). Usage assumptions from the spec (§3.1 loop, §8.2 session config, §8.7 moderation, §9 pipeline), the quality programme (§2 library plus live hero, §6 game scripts) and CHECKPOINT ("Argon code authoring with HIGH reasoning and MEDIUM acceptance planning").

| Line item | Assumption | Unit price | Cost |
|---|---|---|---|
| Live audio input (mic open the whole session) | 10 min | $0.005/min | $0.050 |
| Live audio output (character speaks 30–50 percent) | 3–5 min | $0.018/min | $0.054–$0.090 |
| Live text input (system instruction ~4k tokens, injected notes, world manifest) | billed once: 6k tokens; if context re-billed per turn: 25 turns × ~10k | $0.75/1M | $0.005–$0.19 |
| Live text output (tool calls, transcripts) | ~2k tokens | $4.50/1M | $0.009 |
| **Live subtotal** | | | **$0.12–$0.34** |
| Scene DSL on `gemini-4-argon` | 8k in (style bible, rubric, catalogue, few-shots); 3k out + 8k thinking | $2 / $10 per 1M | $0.016 + $0.11 = $0.13 |
| Game script + acceptance plan on Argon (when the wish is a game) | 10k in; 4k out + 10k thinking; plan 5k out | $2 / $10 per 1M | $0.02 + $0.14 + $0.05 = $0.21 |
| Scene review, moderation of generated strings, image safety checks on `gemini-3.8-flash` | ~10 calls, 20k in, 5k out | $0.75 / $3.75 per 1M | $0.035 |
| Backdrop (`nano-banana-2.1`, 2K) | 1, skipped on library hit | $0.0504 | $0–$0.05 |
| Hero sprite or nine-pose sheet (`nano-banana-2.1`, 1K–2K) | 1 | $0.034–$0.050 | $0.034–$0.050 |
| Props (`gemini-3.1-flash-lite-image`, 1K) | 1–8 | $0.0336 each | $0.034–$0.27 |
| Repair retry (second Argon attempt on validation or playtest failure) | 0–1 | as above | $0–$0.21 |
| **Builder per world** | playground, cached art → game world with 3 images → worst case | | **$0.20 → $0.50 → $0.90** |
| Two worlds per session | | | $0.40–$1.80 |
| Transcript moderation (`gemini-3.8-flash`, ~30 segments × 600 tokens) | | $0.75/1M | $0.014 |
| Handoff and end-of-session summaries (Flash) | 2–3 calls | | $0.01 |
| **Session total (10 min, two worlds)** | low / typical / high | | **$0.55 / $0.90–$1.20 / $2.30** |
| Per active child, 20 sessions/month | | | **$11 / $18–$24 / $46** |
| Family plan quota ceiling (60 min/day, 20 worlds/day, 30 days) | 1,800 min Live + 600 worlds × $0.50 | | about $22 + $300 = $320+/month |
| Free plan quota ceiling (15 min/day, 3 worlds/day) | 450 min + 90 worlds | | about $5.50 + $45 = $50/month |
| Katha story book (6 illustrations at 2K + narrative generation) | per book | | about $0.30 images + $0.10–$0.30 text |
| Photo-to-chibi companion | 1 image | | $0.03–$0.05 |
| Cached reaction clips (`gemini-3.8-flash-tts`), Lyria beds | one-time offline | $0.00225 per 10 s; $0.04 per clip | negligible |

Price changes already announced: Argon input/output to $4/$20 on 2026-12-01; Flash to $1.50/$7.50 and Flash TTS to $1.00/$18.00 on 2027-01-01 — same pricing page.

### Inferences
- The cost driver is not voice (about $0.12–$0.34 per 10 minutes) but world and game generation on Argon with thinking tokens billed as output, plus images. The pitch should say that, because it is also the answer: library composition, Flash for playground worlds, one live hero image, and caching.
- Any live-demo cost is trivial (tens of cents); the problem is the plan design, not the demo.

### Gaps
- Live API context re-billing behaviour and whether input/output transcription is billed separately were not confirmed; the Live line therefore carries a 3× range.
- Cloud Run (gateway "always allocated, 1 vCPU, 1 GiB", spec §13), Firestore, CDN egress and Stripe fees are excluded; at hackathon scale they are small, at 10,000 families they are not.

---

## Top ten changes before 2026-11-24 (ranked by lift to non-engineering judges' scores)

### Takeaway
Seven of the ten changes are product, evidence and narrative work, not code; the three code items are deployment, demo hardening and cost caps.

### Cited Findings and Inferences

| Rank | Change | Why it moves the score | Effort | Risk |
|---|---|---|---|---|
| 1 | Run 10–12 supervised child sessions (ages 6–10, half Bangla-first) with an observation sheet, a 5-item pre/post concept check, three parent interviews and one school/NGO visit with a signed letter of interest; put the numbers and two consented 10-second clips in the video and README. | Impact evidence 1 → 5–6; also fixes demo realism and copy. The spec already planned it (§15). | 6–8 days elapsed, 3 days of team time | Medium: recruiting and consent in Dhaka in three weeks; mitigate via a teacher or NGO contact (BRAC/JAAGO-type) and the team's own families. |
| 2 | Write the §20(d) answer: a one-page "Children's use of Gemini" note citing Google Cloud Service Specific Terms §20(d) and the Gemini API 18+ clause, the controls that address them, the Gemini for Education path for schools, and an explicit request to Google for a children's-use agreement; switch the local stack from `GEMINI_API_KEY` to Vertex ADC so the pitch's "no API keys" is true. | Safety/legitimacy 3 → 6; pre-empts the single question most likely to sink the pitch. | 2 days (note) + 2 days (ADC path) | Low for the note; medium for ADC (Vertex model availability "unverified" per CHECKPOINT). |
| 3 | Cut the demo surface to three: Studio loop (wish → predict → play → discover → Moon dial → pretend), Bangla voice cast, parent summary. Hide Labs, stories, pets, companion photo, billing, admin themes and schools from navigation behind a flag for the demo build; move schools to "roadmap" in one sentence. | Focus 2 → 6; Demo 4 → 6. | 1–2 days | Low; the surfaces stay in the code. |
| 4 | Deploy to Google Cloud (Cloud Run gateway/api/builder, Firebase App Hosting web, Firestore, real Vertex calls) and put the URL on the end card; the spec's own competition requirement is a deployed prototype (§2). | Required by most Google Cloud hackathon rules (hosted URL); Demo and Business both rise. | 4–6 days (Terraform exists; "no cloud resources" yet) | Medium-high: first real Vertex calls, Live model availability, IAM; start now. |
| 5 | Fix unit economics in the plan design: library-first art with one live hero, Flash for playground worlds, Argon only for games, daily caps of 3–5 worlds, a generated-game quota, cache metrics on the admin page; publish a cost-per-session slide (today $0.90–$1.20, target $0.25–$0.40). | Business 3 → 6. Shows the team knows its own numbers before the judge asks. | 3 days | Low-medium: Flash-generated worlds may be less interesting; keep Argon for the demo wishes. |
| 6 | Rewrite README/spec/landing/CLAUDE.md honestly: a one-sentence problem with the NSA 2022 and rote-learning citations, Bangladesh and Bangla first, remove "production grade", "deployed", "lengthens attention span", "two programmers", "Disney"; reconcile 6–10 vs 6–13 and Pip/Bolt/Luna vs Mishti/Bhombol/Chandni; move agent session ledgers out of CHECKPOINT. | Problem clarity 3 → 7; Documentation honesty 7 → 9. | 1 day | None. |
| 7 | Harden the demo path: pre-warm the Live session, cache the assets for five rehearsed wishes (DSL live, art cached, said openly), measure and record wish-to-world p50 on the deployed stack, test Bangla audio on the real device in a noisy room, rehearse the "paint spilled" fallback as a feature, keep the 3200 fixture laptop as backup. | Demo 6 → 8. The "wow" exists; this makes it reliable. | 3 days | Low. |
| 8 | Price and pay for Bangladesh: a Taka plan (Tk 200–500/child/month) on bKash/SSLCommerz or app-store billing alongside the USD plan; state the entity/jurisdiction for Stripe; name the diaspora as the USD segment. | Business 6 → 7; answers "who pays" with a local answer. | 2 days of decisions and copy (integration later) | Low. |
| 9 | Remove or disable the photo-to-chibi companion for the submission and drop "companion" from all copy; keep ready-made friends. | Safety/legitimacy +1; removes the highest-risk, lowest-value surface in the FTC/Character.AI climate and under COPPA 2025 biometric scope. | 0.5 day | Low. |
| 10 | Make the physics claim provable: a 60-second "validator reel" showing a pretend stone vs real stone, the material table clamping a 100-ton feather, and the Discovery rule firing on the jelly dragon in the deployed build; add buoyant-flag and breakable behaviour (`TODO.md` open item) or stop listing them. | Innovation 7 → 8; Documentation honesty; protects "physics-respecting". | 3–4 days (engine) or 0.5 day (copy only) | Medium for engine work; none for the copy fix. |

### Gaps
- Effort estimates assume the current one-human-plus-two-agents cadence; none assumes new hires.

---

## One-paragraph verdict

### Takeaway
Not at winner level today, and the reasons are not engineering. Just Imagine has a genuinely novel core (a child's spoken Bangla wish becomes a validated, physically honest, playable world that a character explains at the moment something happens, with a Moon dial and a pretend-vs-real switch that map onto documented childhood misconceptions) and an engineering and documentation discipline that most hackathon teams never reach. But a Google panel will see twenty-four surfaces and two product lines built in three days by one committer and two agents, zero evidence that any child has touched it, a pricing plan that loses money on its first active child, billing rails that do not exist for a Bangladesh company, and, most dangerously, a product for six-year-olds built on a service whose own terms say it may not be used in applications "likely to be accessed by individuals under the age of 18", a clause the repo never mentions. The fix is four weeks of product discipline rather than code: run a dozen real sessions and a school visit, write the children's-use answer and move to Vertex ADC, deploy to Cloud Run so the URL works, cut the demo to the one unforgettable moment in Bangla, fix the plan economics and say the Taka price, and rewrite the first paragraph of the README as a problem instead of a promise. Do those, and the same repository becomes a credible contender; skip them, and the first judge who asks "has a child used this?" or "are you allowed to do this?" ends the conversation.

### Cited Findings
- All evidence for this verdict is cited in Key questions 1–8 and the scorecard above.

### Gaps
- The specific hackathon rubric and judge panel for the late-November 2026 event were not identifiable; this verdict applies the 2026 Google Cloud hackathon pattern (technical implementation, product design, potential impact, idea quality; hosted URL plus 3-minute video).
