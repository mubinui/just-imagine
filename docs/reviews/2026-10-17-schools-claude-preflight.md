# Schools + STEM preflight — Claude Code, 2026-10-17

Completed through the installed Claude Code CLI in read-only mode, with no tools or file-write capability. This was a separate review session, not an injection into the user's already-open interactive session. The first broader repository-reading CLI attempt returned no result and was cancelled; the bounded excerpt review below completed successfully.

Codex supplied the relevant proposed functions, current family entry-point behavior, and exact reproduction outcomes from [its preflight](2026-10-17-schools-codex-preflight.md). Claude did not independently inspect the repository, execute tests, certify chemistry content, or approve new scope. Its answer is preserved below; recommendations remain proposed changes requiring the assigned implementer's review.

---

**Excerpt-only review: Schools/STEM findings**

**1. studentUid: confirmed, blocking.**
`_` is both the separator and a legal character inside a segment, so `(a_b,c)` and `(a,b_c)` both produce `st_a_b_c`. The maximum length is 3 + 128 + 1 + 128 = 260, which is over the 128-character limit Firebase Admin enforces.

- **Fix:** `st_` + hex SHA-256 of an unambiguous encoding, such as `JSON.stringify([schoolId, studentId])`. That is 67 characters and deterministic. Keep the readable pair in the student doc for reverse lookup.
- **Tests:**
  - The collision pair yields different UIDs.
  - Two 128-character segments yield a UID of 128 characters or fewer.
  - The same input always yields the same output.

**2. Principal gets a family doc: confirmed in principle.**
Keeping the UI away from `POST /api/session` does not enforce anything. Any holder of a verified token can call it and get `users/{uid}`.

- **Challenge:** How serious this is depends on how school identities are separated (a tenant, custom claims, or a separate project). The excerpt doesn't show which.
- **Fix:** On the server, reject tokens that carry a school role claim or school tenant, both in `/api/session` and in the parent preHandler. Fail before any write.
- **Tests:**
  - A principal, teacher, or student token gets 403 and no `users/*` doc is written.
  - A plain parent token still succeeds.

**3. atomBalance: confirmed, blocking because the cache gate depends on it.**

- Number strings longer than about 309 digits become `Infinity`, and `Infinity === Infinity`.
- A coefficient of 0 empties both sides, so the equation reads as balanced.
- Close brackets aren't matched to their opening type.
- **Fix:**
  - Coefficients and subscripts must match `[1-9]\d*` and stay within a small cap.
  - Check `Number.isSafeInteger` on every count and on the multiplied totals.
  - Use a typed bracket stack, and reject a mismatched or unclosed group.
  - On any parse error, return not-balanced so the cache gate fails closed.
- **Tests:**
  - The three reproductions: `0H2->0O2`, `Ca(OH]2`, and two different 400-digit coefficients.
  - An unclosed `Ca(OH2`.
  - A subscript of 0.
  - One known-balanced equation stays `true`.

**4. Volume/concentration controls dropped: valid scope gap, not a code defect.**
The plan narrowing the spec without a recorded approval is a traceability problem. It doesn't need new ceremony. Either reinstate the controls or add a one-line, dated user decision to the plan. No test is needed.

**Ownership handoff**

- **User's Claude Code session:** owns items 1 and 3 as school implementation files. Codex reviews the studentUid contract shape before it lands, since other code will key off it.
- **Codex:** owns item 2, because `/api/session` and the parent preHandler are family integration. The claim name or tenant used for school roles must be agreed with the school side first.
- **User:** owns item 4, whichever way it goes.
- **Uncommitted language/animation work:**
  - Don't use `git stash`, `reset`, `checkout --`, or `add -A`.
  - Each owner works on its own `feat/...` branch, ideally in a separate worktree.
  - Stage only named files.

**Limits of this review**

- I read only the supplied excerpts and reported reproduction results. I didn't inspect the repository, run code or tests, or check the installed Firebase Admin version.
- I didn't check how auth is set up (tenants or claims), or whether other endpoints also create `users/*` docs.
- I didn't evaluate chemistry content, only parser behaviour.
- All conclusions assume the excerpts and reproductions are accurate.
