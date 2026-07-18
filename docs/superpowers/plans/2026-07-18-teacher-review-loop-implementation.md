# Teacher Review Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a review loop where the teacher can request up to 3 AI revisions, add structured manual discount rows, and approve the current version as final.

**Architecture:** Add a `ReviewVersion` persistence layer beside the existing preliminary analysis and final review. Routes operate on the current review version, while old essays without versions fall back to preliminary analysis and lazily create version 1 when needed. The UI keeps local review state so generated revisions and manual rows appear immediately before approval.

**Tech Stack:** Next.js App Router, React client components, Prisma/PostgreSQL, Vitest, Maritaca AI helper.

## Global Constraints

- Maximum of 3 review versions per essay.
- Manual teacher rows must include category, discount, why it lost score, and teacher comment.
- Manual teacher rows must appear in the existing issues table and be clearly marked as `Feito pela professora`.
- Download remains available only after final approval.
- Nothing teacher-facing may display internal English keys.
- Existing essays without `ReviewVersion` rows must keep working.

---

### Task 1: Review Version Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/essay/review-version.ts`
- Modify: `src/app/api/essays/route.ts`
- Test: `tests/unit/essay/review-version.test.ts`
- Test: `tests/integration/api/create-essay.test.ts`

**Interfaces:**
- Produces: `MAX_REVIEW_VERSIONS = 3`
- Produces: `buildInitialReviewVersion(input): ReviewVersionSnapshot`
- Produces: `getLatestReviewVersion<T extends { versionNumber: number }>(versions: T[]): T | null`

- [ ] Write failing tests for initial version payload, latest-version selection, and create-route persistence.
- [ ] Run `pnpm exec vitest run tests/unit/essay/review-version.test.ts tests/integration/api/create-essay.test.ts` and confirm the expected failures.
- [ ] Add `ReviewVersion` and `ReviewVersionSource` to Prisma schema.
- [ ] Implement review-version helpers.
- [ ] Update essay creation to create version 1 only when status is `ready_for_review`.
- [ ] Run the same tests and confirm they pass.

### Task 2: AI Adjustment Route

**Files:**
- Modify: `src/lib/essay/maritaca.ts`
- Create: `src/app/api/essays/[essayId]/request-revision/route.ts`
- Test: `tests/integration/api/request-revision.test.ts`
- Test: `tests/unit/essay/maritaca.test.ts`

**Interfaces:**
- Produces: `analyzeEssayRevisionWithMaritaca(input, options): Promise<MaritacaAnalysisResult>`
- Route: `POST /api/essays/:essayId/request-revision` with `{ teacherInstruction: string }`
- Response: current review payload with version number, issues, scores, raw score, and 1000 score.

- [ ] Write failing tests for creating revision 2 from preliminary fallback.
- [ ] Write failing test that version 3 blocks further AI revision.
- [ ] Write failing prompt test proving the teacher instruction and rule zero are sent to Maritaca.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement Maritaca revision helper.
- [ ] Implement request-revision route with ownership check and max-version guard.
- [ ] Run targeted tests and confirm they pass.

### Task 3: Manual Teacher Issue Route

**Files:**
- Modify: `src/lib/essay/types.ts`
- Modify: `src/lib/essay/issues.ts`
- Create: `src/app/api/essays/[essayId]/manual-issue/route.ts`
- Test: `tests/unit/essay/issues.test.ts`
- Test: `tests/integration/api/manual-issue.test.ts`

**Interfaces:**
- Extends: `EssayIssue` with optional `source`, `sourceLabel`, and `teacherComment`.
- Produces: `buildTeacherIssue(input): EssayIssue`
- Produces: `applyIssueDiscount(scores, issue): Record<CriterionKey, number>`
- Route: `POST /api/essays/:essayId/manual-issue` with `{ quote?, category, scoreImpact, explanation, teacherComment }`

- [ ] Write failing tests for source label, category mapping, discount application, and route update.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement issue source helpers and manual issue builder.
- [ ] Implement manual-issue route to append into the current review version.
- [ ] Run targeted tests and confirm they pass.

### Task 4: Teacher UI, Approval, and Report

**Files:**
- Modify: `src/app/(dashboard)/dashboard/essays/[essayId]/page.tsx`
- Modify: `src/components/review/review-shell.tsx`
- Modify: `src/components/review/issues-table.tsx`
- Modify: `src/lib/essay/report.ts`
- Modify: `src/app/api/essays/[essayId]/approve/route.ts`
- Modify: `src/app/globals.css`
- Test: `tests/unit/ui-polish.test.tsx`
- Test: `tests/unit/essay/report.test.ts`
- Test: `tests/integration/api/approve-essay.test.ts`

**Interfaces:**
- `ReviewShell` consumes current version number, max review versions, current issues, scores, and totals.
- Approval payload includes the current review version number.
- Report renders manual rows with `Feito pela professora`.

- [ ] Write failing UI tests for version label, revision controls, manual issue form, and teacher-source badge.
- [ ] Write failing report test for manual row source.
- [ ] Write failing approval test for saving the approved version number.
- [ ] Run targeted tests and confirm failures.
- [ ] Update the review page to load the latest version or fallback to preliminary analysis.
- [ ] Update `ReviewShell` to request AI revision, append manual issue, and approve current state.
- [ ] Update report and approval route.
- [ ] Add focused CSS for the new controls without changing the visual language.
- [ ] Run targeted tests and confirm they pass.

### Final Verification

- [ ] Run `pnpm prisma:generate`.
- [ ] Run `pnpm exec tsc --noEmit`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm build`.
- [ ] If deploying, apply the additive database schema update before or with the deployment.
- [ ] Verify the existing Piloto 02 review page still opens and the issues table remains Portuguese-only.
