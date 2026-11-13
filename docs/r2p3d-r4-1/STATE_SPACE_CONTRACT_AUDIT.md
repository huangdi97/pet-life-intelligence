# R4.1 State-Space Contract Audit — STAGE-V-VISUAL-02

> Date: 2026-10-02 · Branch: `feat/r2p3d-r3-render-truth-ui-closure` · PR #2 (OPEN)

## 1. Expected (test contract)

`tests/e2e-browser/specs/stage-v-visual.spec.ts` — STAGE-V-VISUAL-02:

```ts
await page.goto("/pets/00000000-0000-0000-0000-00000000dead");
await expect(page.locator("body")).toContainText("404", { timeout: 15_000 });
```

Semantic: an **unknown pet id** must land in a dedicated **not-found** state, not a
generic crash/error boundary.

## 2. Actual (observed failure, reproduced locally)

The body rendered the **generic error boundary** instead:

```
…页面出了点问题 / 请重试；如果问题持续，请联系支持。刷新重试 / 回到今日
```

The app's layout (top nav + shell) stayed mounted; the page body was the
`apps/web/app/error.tsx` boundary — not the pet page's dedicated 404 branch.

## 3. Root cause

`apps/web/app/pets/[id]/page.tsx` had a **React hook-order violation**:

- The page calls `useAsync(...)` for `pet`, `consents`, `today`, `petsList`,
  `friends` (lines ~53–69), then **early-returns** on `denied` and on the
  not-found branch (`pet.state === "error" && ApiError 404/NOT_FOUND`).
- A **later** `useAsync(twinModels)` (added in R4 for the canonical twin on
  Pet World) was declared **after those early returns** (was ~line 120).

Consequences:

| render pass | hooks called |
| --- | --- |
| loading (pet in flight) | 6 (… + twinModels) |
| error 404 (notFound early return) | 5 (twinModels skipped) |

React sees a different hook count between renders → throws
"Rendered more hooks than during the previous render" → the **error boundary**
catches it → the dedicated 404 state never renders. This is a real runtime
defect introduced by the R4 twin addition, hidden until the API 404 path runs.

The API side is correct: `GET /api/v1/pets/<dead-uuid>` returns
`404 {"error":{"code":"NOT_FOUND",...}}` (verified live).

## 4. Product decision

**Unknown pet id → dedicated not-found state** (not the generic error
boundary). This matches:
- the existing in-page 404 branch in `pets/[id]/page.tsx` (h1 "404" +
  `notFound.title` + 回到今日 link), and
- the shared `apps/web/app/not-found.tsx` (页面不存在 / 回到今日).

The test's expectation (body signals "404") is the correct contract; the
runtime was the wrong side. The generic error boundary stays for genuine
render errors only.

## 5. Code change

`apps/web/app/pets/[id]/page.tsx`:
- Moved the `twinModels` `useAsync` **above every early return** (next to the
  other hooks), along with the `activeTwin` / `twinDescriptor` derivation.
- Added an explicit comment (STAGE-V-VISUAL-02 regression) explaining why the
  hooks must all be declared before any early return.
- The dedicated 404 branch (h1 "404" + home link) is unchanged.

## 6. Test change

None. `STAGE-V-VISUAL-02` passes unchanged (verified: 1 passed, 12.6s).

## 7. Verification

- `pnpm --dir apps/web typecheck` — clean.
- `playwright test stage-v-visual -g "STAGE-V-VISUAL-02"` — **PASS**.
- Full functional suite (42 tests, incl. `stage-h2-3d` honest-state, 3D
  runtime, seven-paths IDOR) — **42 passed** (3.9m).

## 8. Notes

No weak assertions, no expected-string edits, no baseline promotion: the
contract stays "unknown pet → dedicated 404"; the fix is on the runtime side.
