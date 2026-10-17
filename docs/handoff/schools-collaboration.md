# Schools + STEM collaboration

Updated: 2026-10-17. User requested that Codex work with Claude Code on the new features.

## Current truth

The family work is now on `feat/creative-experience-upgrades`, based at `bc626dd` with existing uncommitted language, motion and game-quality changes preserved. The user requires new-feature pushes on feature branches. The real app remains on3300; persistent demo emulators8080/9099 must not be reset for tests.

Claude's school implementation is in separate worktrees: `../just-imagine-schools` on `feat/schools-stem` (observed HEAD `2b856f6`) and `../just-imagine-schools-s3` on `feat/schools-stem-s3` (observed HEAD `0db7d01`). S3 integrates into `feat/schools-stem`; Codex reviews/integrates there. These branches now contain implementation commits, while the family base commit contains only school plans/spec. No school runtime acceptance is implied by the existence of those commits. The earlier preflight findings need verification against this actual source. No remote branch was created by the routing update.

The user has now explicitly confirmed: **Claude: implementation; Codex: review and integration**. Existing file claims in CHECKPOINT/spec §17 remain authoritative; Codex does not take over S0/S3 implementation. Any unresolved product decisions in the draft spec still need a recorded decision.

## Ownership and handoff

| Work                                                                                          | Owner/current status                                                        |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| New school protocol, school/student API, school/study screens, STEM packages and tutor module | Claude Code's claim; implementation active in separate school worktrees     |
| Shared protocol/admin/gateway review                                                          | Codex; bounded preflight completed, actual implementation review pending    |
| Family Gallery/Studio catalog integration, Learn/persona story-pack integration               | Codex handoff after catalog contracts land                                  |
| Builder system-owner catalog generation                                                       | Codex stretch handoff; requires a concrete approved ownership/data boundary |
| Existing family language/motion implementation                                                | Codex; preserve working-tree changes                                        |
| S0 vs S3 reassignment                                                                         | User confirmed Claude implementation; Codex review and integration          |

Claim each shared-file insertion in CHECKPOINT before editing and re-read it immediately before writing. Stage/commit only owned paths/hunks. Coordinate any lockfile update. Use isolated test emulators; never overwrite source or reset demo data to obtain a clean baseline.

## Immediate review packet for Claude

Read [Codex preflight](../reviews/2026-10-17-schools-codex-preflight.md) before implementing the shared contracts. Reproduced blockers: ambiguous/overlong student UID encoding, family API/session role separation, and malformed-equation acceptance in the planned atom-balance gate. Also reconcile the planned removal of chemistry quantity controls with the spec.

A bounded read-only Claude Code CLI review completed: [Claude review](../reviews/2026-10-17-schools-claude-preflight.md). It reviewed supplied excerpts and exact reproduction results, not repository files or running tests. It agreed with the identity/parser findings and the family-role boundary concern; the spec confirms same-project claims, so separate-tenant mitigation does not apply here. It treated the quantity-control omission as a scope gap, not a code defect. This is actual separate CLI collaboration; the user's existing interactive session was not controlled or messaged. This preflight did not run school runtime tests; actual implementation now exists in the separate worktrees and still needs Codex review.

## Next steps

1. Carry the reconciled reviews into Claude’s implementation session using the confirmed ownership: Claude implements, Codex reviews and integrates. Resolve the quantity-control scope against the original spec; no omission is approved.
2. Correct shared-contract blockers before implementing/freezing S0.
3. Execute nonoverlapping approved phase tasks, tracking red/green checks and source ownership.
4. Codex reviews the actual protocol/auth/rules/gateway insertions before integration.
5. Run the real role-to-role demo only after the backend, views and grading exist; do not mark planned features as running.

## Agreed review packet

- Claude's school implementation: correct student UID encoding and formula validation before landing/freezing those contracts. Codex reviews the actual changes and boundary tests.
- Codex's family integration: add server-side role separation to parent session/API entry points once the school claims contract is confirmed; preserve parent/operator access and existing family data.
- Chemistry quantity controls: no omission has been approved by this collaboration. Retain the original spec requirement until a recorded user decision changes it.
- Current gates remain open: school runtime implementation, authoritative content review, role isolation/integration tests and real end-to-end school demo. No plan checkbox is marked implemented merely because these reviews completed.

## Confirmed collaboration update — 2026-10-17

The user answered the pending ownership question: “Claude: implementation; Codex: review and integration”. Codex’s current game-quality work is confined to the existing builder/runtime/renderer and its tests/configuration; it does not claim school implementation paths. Use the preflight packet when school contracts land, then review actual source, role boundaries and integration evidence before family catalog/story-pack wiring.

# Current integration update — 2026-10-17

The user subsequently approved full parallel implementation and integration on `feat/family-schools-integration`. Current source, runtime evidence and remaining limits are recorded in [family-schools-integration.md](family-schools-integration.md). The ownership notes below describe the earlier handoff and do not override that later authorization.
