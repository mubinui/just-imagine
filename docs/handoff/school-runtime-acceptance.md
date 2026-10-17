# School runtime acceptance

Date: 2026-10-17. Environment: the combined local Docker stack, web `http://localhost:3300`, API `http://localhost:3301`, gateway `ws://localhost:8788`, Firestore emulator `8080` and Auth emulator `9099`, project `demo-just-imagine-local`.

These are actual requests against the running stack. No emulator reset, family-data migration, microphone capture or browser automation was performed. Private demo credentials and PINs were read into memory from the existing ignored local files. Tokens, credentials, transcripts, captions and audio were never written to acceptance logs or this document.

## Teacher and student workflow: passed

A clearly named synthetic QA lesson was copied from the published global Force lesson `w_01m54vwzp7516trc8wy2d2w262`. The resulting class-scoped lesson is `w_01m54wf2x39t8tsecm5fh418pw`; its title begins `QA backend acceptance`. The existing demo student `student01` was used. The QA lesson and its assessment results remain available for review.

All 21 pre-AI checks passed:

| Check                                  | Observed result                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Existing student PIN login             | Custom token returned and exchanged successfully.                                                                 |
| Current student identity               | Student profile, current school and class returned.                                                               |
| Teacher copies published global lesson | New school-owned draft returned.                                                                                  |
| Teacher edits named QA lesson          | Class scope and named synthetic title saved.                                                                      |
| Draft hidden from student              | Student detail request returned 404.                                                                              |
| English approval                       | Recorded through the actual API.                                                                                  |
| Bangla approval                        | Recorded through the actual API.                                                                                  |
| Publication                            | Published at the current revision.                                                                                |
| Student lesson access                  | Published lesson returned without its answer-key document.                                                        |
| Concurrent quiz completion             | Both simultaneous API submissions completed successfully.                                                         |
| First-correct points                   | The two submissions awarded 11 points in total.                                                                   |
| Grading                                | Every submitted QA answer was graded correctly, including Bengali numeric answers and the locked simulation task. |
| Idempotent retake                      | Repeating the same quiz awarded zero additional points.                                                           |
| Class leaderboard                      | The student appeared on the actual class board.                                                                   |
| School leaderboard                     | The student appeared on the actual school board.                                                                  |
| Teacher results                        | The actual student attempt showed the single 11-point award.                                                      |
| Curated neutralisation                 | Table-backed HCl/NaOH result returned.                                                                            |
| Excess acid                            | Table-backed quantitative result returned.                                                                        |
| Excess base                            | Table-backed quantitative result returned.                                                                        |
| Quantitative pH                        | Neutral 7.0000; excess acid 1.4771; excess base 12.5229.                                                          |
| Family preservation                    | The protected-family fingerprint matched before and after the workflow.                                           |

The quantitative checks used 0.1 M HCl and NaOH. Equal 50 mL portions were neutral; the excess cases used 100 mL of one solution and 50 mL of the other. This verifies the implemented ideal dilute strong acid/base model; it does not certify all chemistry content or physical laboratory behavior.

## Real typed Gemini Live tutor: passed

The existing student authenticated to the running WebSocket gateway and opened the QA lesson's simulation step. A typed Bangla physics question was submitted. No microphone permission or incoming audio frames were used.

| Signal                             | Observed result                       |
| ---------------------------------- | ------------------------------------- |
| Provider/session ready             | Yes                                   |
| Character captions received        | Yes                                   |
| Bengali script present in captions | Yes                                   |
| Generated audio output             | 21,120 bytes                          |
| Error code                         | None                                  |
| Connection closed                  | Yes, after the harness ended the call |
| Family preservation after the call | Unchanged                             |

Only booleans and byte counts were retained. This proves an actual typed Live request produced captions containing Bangla and audio; it does not independently certify spoken fluency, the complete answer's educational correctness, or rendered avatar behavior.

## Protected family data

The harness recursively read and fingerprinted the existing `users`, `worlds`, `sessions`, `stories`, `usageDaily` and `subscriptions` collection trees. All 298 records in that protected scope matched before and after the API workflow and again after the Live call. This count includes nested descendants. No existing document was reset or rewritten by these checks.

## Model-backed drafting and translation

The enriched authoring prompt supplies parameter JSON schemas, predicate argument schemas and real solved active-lesson examples. The first actual HTTP draft request returned `500 INTERNAL`: its structured-output provider request was rejected with HTTP `400 INVALID_ARGUMENT`, before local lesson validation. The exact rejected schema feature was not established. The same image's real translation request returned HTTP 200 with a validated draft and Bangla approval reset to false. A second typed Live tutor check also passed, producing 6,720 audio bytes and captions containing Bangla.

The provider path now makes at most one same-model retry in JSON mode after an HTTP 400 structured-schema rejection, quoting the entire output schema in the prompt. Both paths retain the complete local schema and deterministic science checks; no lesson template substitutes for model output. Invalid provider JSON or malformed model data produces an actionable 503 with the saved lesson unchanged. This follows the [official Gemini structured-output guidance](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en), which documents a JSON Schema subset and requires application validation.

A real provider call using the patched source passed the complete draft and answer-key validation, including numeric recomputation. The 12 school model boundary tests, API typecheck and lint passed.

The subsequent release image (manifest prefix `0abfb8`) passed the actual HTTP checks: drafting returned 200 with a validated lesson/key draft and both language approvals false; translation returned 200 with a validated draft and Bangla approval false. Neither endpoint silently saved or published the returned draft. A final typed Live tutor request produced captions containing Bangla and 11,520 audio bytes, with no error. The 298 protected family records still matched the original fingerprint after all these requests.

## Evidence scope

The temporary acceptance harness is outside the repository at `/tmp/ji-school-stack-acceptance.mjs`; its metadata-only result is `/tmp/ji-school-running-acceptance.json`. These files are operational scratch artifacts and are not required to run the application. Unit/emulator suite counts are recorded separately by the integration owner; they are not substituted here for running-stack evidence.
