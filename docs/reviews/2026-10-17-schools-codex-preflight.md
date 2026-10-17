# Schools + STEM preflight — Codex, 2026-10-17

Scope: the newly committed spec/master/S0/S3 plans, not an implementation review. At HEAD `bc626dd`, there are no `stem-sims`, `stem-content`, school protocol or school/study runtime modules in this working tree. Text inside a plan's example “landed” checkpoint block is an instruction for future work, not evidence that work landed.

## Findings to resolve before implementation/integration

1. **P1 — student UID collisions and invalid length.** S0 lines278–279 concatenate independently valid document IDs with underscores. `studentUid('a_b','c')` and `studentUid('a','b_c')` are equal. Two accepted 128-character IDs produce a260-character UID, but the installed Firebase Admin validator requires at most128. Define a canonical unambiguous, length-bounded identity representation and use it consistently in token minting, guards, revocation and rules. Add collision and maximum-length tests before freezing this shared contract. Do not change the global family `DocumentIdSchema` to solve a school-only issue.
2. **P1 — enforce family/school separation on the server.** Spec §4.1 says a school principal never gets a family `users/{uid}` document; §4.4 says school pages do not call `/api/session`. Current `apps/web/app/api/session/route.ts:15` verifies the token and can create that family document when consent=true, without checking role. `services/api/src/app.ts:98` likewise treats any verified UID as a parent. UI routing alone cannot enforce this contract once school login exists. Reject school principals at both family entry points and test direct requests; preserve existing parents and operators. Teacher invite acceptance must also handle an existing family identity explicitly, rather than silently converting it.
3. **P1 — formula parser is too permissive for the proposed AI acceptance gate.** The unmodified S3 formula example accepts `0H2 -> 0O2` as balanced, accepts mismatched `Ca(OH]2`, and treats two different huge coefficients that overflow to Infinity as equal. Require positive finite safe-integer coefficients/subscripts, matching bracket types, bounded parsing/arithmetic and strict equation terms. Test these invalid cases before using `atomBalance` to approve/cache AI chemistry. This finding is about parser validation, not a claim of physical or chemical correctness.
4. **P2 — chemistry acceptance scope needs reconciliation.** Spec §10.2 includes volumes/concentrations; S3 self-review silently drops them for v1. The plan's pure mixer is a curated set lookup, not quantitative stoichiometry. Keep this distinction explicit: implement the requested parameters or obtain a recorded scope decision before marking the specified lab complete. Unknown mixtures must not be presented as scientifically verified predictions.

## Reproduction performed

- Ran the exact planned UID concatenation against the current `DocumentIdSchema`: collision=true, maximum accepted pair length=260. Checked installed `firebase-admin/lib/utils/validator.js:138` for its128-character UID limit.
- Extracted the exact fenced formula/element implementation from the S3 plan into private `/tmp` modules. The only harness change was the relative import path; no logic was changed. Ran three boundary probes: zero-coefficient balance=true, mismatched brackets accepted=true, nonfinite coefficients accepted=true.
- These are executable **plan-example probes**, not school package/unit/API integration tests. No new school runtime code was created or claimed passing. No existing application services or demo data were changed.

## Review gates for later phases

- Protocol: school/student identity uniqueness, length limits, strict boundaries, hidden answer keys and language parity.
- Authorization: direct family-route rejection of school identities, school/class isolation, wrong/expired/revoked claims, suspension behavior, no client writes.
- Grading: server-owned predicate/key and allowed editable parameters; reject changed locked parameters and forged observable state; award points once across concurrent retries.
- Chemistry: fail malformed equations closed before cache/publication; authoritative curriculum and chemistry review remain distinct from atom balance.
- Integration: anchored shared-file insertions only, re-read before editing, no broad staging, preserve Codex's existing family language/motion hunks.

## Claude Code collaboration

A bounded read-only Claude Code CLI review completed and agreed with the ID/parser findings, confirmed the family-role issue in principle, and distinguished the quantity-control omission as a scope gap. [Claude's full review and limits](2026-10-17-schools-claude-preflight.md) are preserved. It reviewed supplied excerpts and reproduction outcomes only, without repository inspection or tests. The spec confirms same-project custom claims, resolving its question about whether separate auth tenants change the family-role issue. Existing implementation ownership remains with Claude under spec §17 until reassigned explicitly; Codex owns the family entry-point integration/review. No fix is claimed implemented.
