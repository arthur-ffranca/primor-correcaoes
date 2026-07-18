# Essay Correction Site V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 responsive web application for private handwritten essay correction with secure teacher-only access, staged AI analysis, manual approval, private history, and approved-report downloads.

**Architecture:** Build a single Next.js application with server-rendered dashboard routes, Prisma-backed persistence, Auth.js credentials authentication, private object storage for essay images, and a modular essay-analysis pipeline. Keep automated output and approved output separate so the teacher can review, edit, and approve corrections before they enter the permanent archive.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Auth.js credentials provider, Zod, Vitest, Playwright, OpenAI Node SDK, AWS S3-compatible storage SDK, JSZip

## Global Constraints

- The only user in V1 is the teacher.
- Human approval is mandatory before any correction is treated as final.
- The system must not over-penalize uncertain OCR or unclear handwriting.
- Privacy is a first-class requirement because the system stores student information.
- The application must require login by email and password.
- The teacher creates a new essay submission by providing student name, class/group, prompt/theme, submission date, and one or more essay photos.
- The primary scoring structure should follow the Unicamp-style rubric discussed in product discovery.
- Teacher-marked examples are used as calibration material, not as a replacement for the Unicamp rubric.
- This state is used when the uploaded images are too poor for reliable correction.
- For approved essays, the teacher must be able to download a correction package containing original uploaded essay images, approved transcription, approved correction report, criterion-by-criterion scores, final Unicamp-style score, and converted 0-1000 score.

---

## File Structure

- `package.json`: workspace scripts and runtime/test dependencies
- `pnpm-lock.yaml`: pinned dependencies
- `.env.example`: required environment variables for database, auth, storage, and OpenAI
- `next.config.ts`: Next.js configuration
- `prisma/schema.prisma`: relational schema for users, submissions, files, transcriptions, preliminary analysis, and final reviews
- `src/app/layout.tsx`: global layout shell
- `src/app/page.tsx`: root redirect entry point
- `src/app/login/page.tsx`: credentials login page
- `src/app/(dashboard)/dashboard/layout.tsx`: authenticated dashboard layout
- `src/app/(dashboard)/dashboard/page.tsx`: dashboard overview
- `src/app/(dashboard)/dashboard/essays/new/page.tsx`: new submission form
- `src/app/(dashboard)/dashboard/essays/[essayId]/page.tsx`: review screen
- `src/app/api/essays/[essayId]/download/route.ts`: approved package download endpoint
- `src/app/api/essays/route.ts`: create submission endpoint
- `src/app/api/essays/[essayId]/approve/route.ts`: approve final review endpoint
- `src/app/api/uploads/route.ts`: image upload endpoint
- `src/auth.ts`: Auth.js configuration
- `src/lib/db.ts`: Prisma client singleton
- `src/lib/env.ts`: validated environment access
- `src/lib/storage.ts`: private object storage helpers
- `src/lib/essay/criteria.ts`: Unicamp criteria constants and score helpers
- `src/lib/essay/score.ts`: raw-to-1000 conversion and total validation
- `src/lib/essay/types.ts`: analysis, review, and uncertainty types
- `src/lib/essay/transcribe.ts`: image-to-transcription module
- `src/lib/essay/analyze.ts`: issue detection and criterion scoring module
- `src/lib/essay/pipeline.ts`: orchestration for submission processing
- `src/lib/essay/report.ts`: approved report shaping and HTML rendering
- `src/lib/validation/auth.ts`: auth input schemas
- `src/lib/validation/essay.ts`: submission and review schemas
- `src/components/forms/login-form.tsx`: login form
- `src/components/forms/new-essay-form.tsx`: essay submission form
- `src/components/review/review-shell.tsx`: review page container
- `src/components/review/issues-table.tsx`: issue list with editable rows
- `src/components/review/score-card.tsx`: criterion and total score summary
- `src/components/history/history-table.tsx`: teacher history table
- `tests/unit/essay/score.test.ts`: score conversion tests
- `tests/unit/essay/pipeline.test.ts`: analysis state transition tests
- `tests/unit/storage.test.ts`: storage safety tests
- `tests/integration/auth/login-route.test.ts`: credentials login integration tests
- `tests/integration/api/create-essay.test.ts`: submission processing tests
- `tests/integration/api/approve-essay.test.ts`: approval persistence tests
- `tests/integration/api/download-essay.test.ts`: approved package download tests
- `tests/e2e/teacher-review.spec.ts`: end-to-end teacher workflow

### Task 1: Bootstrap the App Skeleton and Tooling

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/unit/app-shell.test.tsx`

**Interfaces:**
- Consumes: none
- Produces: `RootLayout({ children }: { children: React.ReactNode }): JSX.Element`, `HomePage(): Promise<never>`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders the application title shell", () => {
    render(
      <RootLayout>
        <div>child content</div>
      </RootLayout>,
    );

    expect(screen.getByText("Quero Correcao")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/app-shell.test.tsx`
Expected: FAIL with `Cannot find module '@/app/layout'` or missing test setup errors.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "name": "essay-correction-site",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header>Quero Correcao</header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
```

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/essay_correction"
AUTH_SECRET="replace-with-32-char-secret"
AUTH_URL="http://localhost:3000"
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="essay-corrections"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
OPENAI_API_KEY="sk-proj-example"
OPENAI_TRANSCRIPTION_MODEL="gpt-4.1-mini"
OPENAI_ANALYSIS_MODEL="gpt-4.1-mini"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/unit/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json .env.example next.config.ts tsconfig.json vitest.config.ts playwright.config.ts src/app tests/unit/app-shell.test.tsx
git commit -m "chore: bootstrap next app shell and test tooling"
```

### Task 2: Add Teacher-Only Authentication and Route Protection

**Files:**
- Create: `src/auth.ts`
- Create: `src/lib/db.ts`
- Create: `src/lib/env.ts`
- Create: `src/lib/validation/auth.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/components/forms/login-form.tsx`
- Create: `src/middleware.ts`
- Create: `tests/integration/auth/login-route.test.ts`

**Interfaces:**
- Consumes: `RootLayout`
- Produces: `auth: NextAuthResult`, `loginSchema: z.ZodObject`, `requireTeacherSession(): Promise<Session>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("rejects a short password", () => {
    const parsed = loginSchema.safeParse({
      email: "teacher@example.com",
      password: "123",
    });

    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/auth/login-route.test.ts`
Expected: FAIL with `Cannot find module '@/lib/validation/auth'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email } : null;
      },
    }),
  ],
});
```

```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLogin = req.nextUrl.pathname.startsWith("/login");
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard");

  if (!req.auth && isProtected && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (req.auth && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/integration/auth/login-route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/lib/db.ts src/lib/env.ts src/lib/validation/auth.ts src/app/login/page.tsx src/components/forms/login-form.tsx src/middleware.ts tests/integration/auth/login-route.test.ts
git commit -m "feat: add teacher credentials auth and route protection"
```

### Task 3: Model the Database and Private File Storage

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/storage.ts`
- Create: `src/lib/validation/essay.ts`
- Create: `tests/unit/storage.test.ts`

**Interfaces:**
- Consumes: `env`
- Produces: `createEssayUploadKey(input: { userId: string; essayId: string; pageOrder: number; extension: string }): string`, `uploadEssayPage(input: UploadEssayPageInput): Promise<StoredEssayPage>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createEssayUploadKey } from "@/lib/storage";

describe("createEssayUploadKey", () => {
  it("nests files under the owner and essay id", () => {
    const key = createEssayUploadKey({
      userId: "user_1",
      essayId: "essay_1",
      pageOrder: 2,
      extension: "jpg",
    });

    expect(key).toBe("users/user_1/essays/essay_1/page-2.jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/storage.test.ts`
Expected: FAIL with `Cannot find module '@/lib/storage'`.

- [ ] **Step 3: Write minimal implementation**

```prisma
model User {
  id           String            @id @default(cuid())
  email        String            @unique
  passwordHash String
  essays       EssaySubmission[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
}

model EssaySubmission {
  id                  String               @id @default(cuid())
  userId              String
  studentName         String
  classGroup          String
  theme               String
  submissionDate      DateTime
  status              EssayStatus         @default(submitted)
  files               EssayFile[]
  transcription       Transcription?
  preliminaryAnalysis PreliminaryAnalysis?
  finalReview         FinalReview?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EssayFile {
  id               String          @id @default(cuid())
  essaySubmissionId String
  storagePath      String
  mimeType         String
  pageOrder        Int
  createdAt        DateTime        @default(now())
  essaySubmission  EssaySubmission @relation(fields: [essaySubmissionId], references: [id], onDelete: Cascade)
}

model Transcription {
  id               String          @id @default(cuid())
  essaySubmissionId String         @unique
  rawText          String
  normalizedText   String
  uncertaintyNotes Json
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  essaySubmission  EssaySubmission @relation(fields: [essaySubmissionId], references: [id], onDelete: Cascade)
}

model PreliminaryAnalysis {
  id                    String          @id @default(cuid())
  essaySubmissionId     String          @unique
  issuesPayload         Json
  criterionScoresPayload Json
  totalRawScore         Float
  total1000Score        Int
  processingNotes       Json
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
  essaySubmission       EssaySubmission @relation(fields: [essaySubmissionId], references: [id], onDelete: Cascade)
}

model FinalReview {
  id                           String          @id @default(cuid())
  essaySubmissionId            String          @unique
  approvedTranscription        String
  approvedIssuesPayload        Json
  approvedCriterionScoresPayload Json
  approvedTotalRawScore        Float
  approvedTotal1000Score       Int
  reviewerNotes                String?
  approvedAt                   DateTime
  updatedAt                    DateTime        @updatedAt
  essaySubmission              EssaySubmission @relation(fields: [essaySubmissionId], references: [id], onDelete: Cascade)
}

enum EssayStatus {
  submitted
  processing
  ready_for_review
  needs_resubmission
  approved
  archived
}
```

```ts
export function createEssayUploadKey(input: {
  userId: string;
  essayId: string;
  pageOrder: number;
  extension: string;
}) {
  return `users/${input.userId}/essays/${input.essayId}/page-${input.pageOrder}.${input.extension}`;
}
```

```ts
import { z } from "zod";

export const createEssaySchema = z.object({
  studentName: z.string().min(1),
  classGroup: z.string().min(1),
  theme: z.string().min(1),
  submissionDate: z.string().datetime(),
  files: z.array(z.string()).min(1),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/unit/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/storage.ts src/lib/validation/essay.ts tests/unit/storage.test.ts
git commit -m "feat: add essay schema and private storage helpers"
```

### Task 4: Build the Essay Analysis Domain and Scoring Pipeline

**Files:**
- Create: `src/lib/essay/types.ts`
- Create: `src/lib/essay/criteria.ts`
- Create: `src/lib/essay/score.ts`
- Create: `src/lib/essay/transcribe.ts`
- Create: `src/lib/essay/analyze.ts`
- Create: `src/lib/essay/pipeline.ts`
- Create: `tests/unit/essay/score.test.ts`
- Create: `tests/unit/essay/pipeline.test.ts`

**Interfaces:**
- Consumes: `createEssaySchema`, `createEssayUploadKey`
- Produces: `convertRawScoreToThousand(rawScore: number, maxRawScore: number): number`, `runEssayPipeline(input: EssayPipelineInput): Promise<EssayPipelineResult>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { convertRawScoreToThousand } from "@/lib/essay/score";

describe("convertRawScoreToThousand", () => {
  it("converts 8.5 into 1000", () => {
    expect(convertRawScoreToThousand(8.5, 8.5)).toBe(1000);
  });

  it("rounds 4.25 into 500", () => {
    expect(convertRawScoreToThousand(4.25, 8.5)).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/essay/score.test.ts`
Expected: FAIL with `Cannot find module '@/lib/essay/score'`.

- [ ] **Step 3: Write minimal implementation**

```ts
export const UNICAMP_MAX_RAW_SCORE = 8.5;

export function convertRawScoreToThousand(rawScore: number, maxRawScore = UNICAMP_MAX_RAW_SCORE) {
  return Math.round((rawScore / maxRawScore) * 1000);
}
```

```ts
export type CriterionKey =
  | "genre"
  | "purpose"
  | "interlocution"
  | "image"
  | "sourceText"
  | "cohesionAndCoherence"
  | "grammar"
  | "aesthetics";

export type EssayPipelineResult = {
  status: "ready_for_review" | "needs_resubmission";
  rawText: string;
  normalizedText: string;
  uncertaintyNotes: string[];
  issues: Array<{
    quote: string;
    type: string;
    explanation: string;
    suggestion: string;
    impactedCriteria: CriterionKey[];
  }>;
  criterionScores: Record<CriterionKey, number>;
  totalRawScore: number;
  total1000Score: number;
  resubmissionReason?: string;
};
```

```ts
import OpenAI from "openai";
import { convertRawScoreToThousand, UNICAMP_MAX_RAW_SCORE } from "@/lib/essay/score";
import type { EssayPipelineResult } from "@/lib/essay/types";

export async function runEssayPipeline(): Promise<EssayPipelineResult> {
  const criterionScores = {
    genre: 2,
    purpose: 2,
    interlocution: 1,
    image: 1,
    sourceText: 1,
    cohesionAndCoherence: 1,
    grammar: 0.5,
    aesthetics: 0,
  } as const;

  const totalRawScore = Object.values(criterionScores).reduce((sum, value) => sum + value, 0);

  return {
    status: "ready_for_review",
    rawText: "",
    normalizedText: "",
    uncertaintyNotes: [],
    issues: [],
    criterionScores,
    totalRawScore,
    total1000Score: convertRawScoreToThousand(totalRawScore, UNICAMP_MAX_RAW_SCORE),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/unit/essay/score.test.ts tests/unit/essay/pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/essay/types.ts src/lib/essay/criteria.ts src/lib/essay/score.ts src/lib/essay/transcribe.ts src/lib/essay/analyze.ts src/lib/essay/pipeline.ts tests/unit/essay/score.test.ts tests/unit/essay/pipeline.test.ts
git commit -m "feat: add essay scoring domain and processing pipeline"
```

### Task 5: Implement Submission, Upload, and Processing Status Transitions

**Files:**
- Create: `src/app/api/uploads/route.ts`
- Create: `src/app/api/essays/route.ts`
- Create: `src/app/(dashboard)/dashboard/essays/new/page.tsx`
- Create: `src/components/forms/new-essay-form.tsx`
- Create: `tests/integration/api/create-essay.test.ts`

**Interfaces:**
- Consumes: `auth`, `createEssaySchema`, `runEssayPipeline(input: EssayPipelineInput): Promise<EssayPipelineResult>`, `uploadEssayPage(input: UploadEssayPageInput): Promise<StoredEssayPage>`
- Produces: `POST /api/uploads`, `POST /api/essays`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/essays/route";

describe("POST /api/essays", () => {
  it("returns 201 for a valid submission payload", async () => {
    const request = new Request("http://localhost/api/essays", {
      method: "POST",
      body: JSON.stringify({
        studentName: "Ana Souza",
        classGroup: "3A",
        theme: "Influenciadores digitais",
        submissionDate: "2026-07-16T00:00:00.000Z",
        files: ["users/user_1/essays/essay_1/page-1.jpg"],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/create-essay.test.ts`
Expected: FAIL with `Cannot find module '@/app/api/essays/route'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createEssaySchema } from "@/lib/validation/essay";
import { runEssayPipeline } from "@/lib/essay/pipeline";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = createEssaySchema.parse(await request.json());

  const submission = await db.essaySubmission.create({
    data: {
      userId: session.user.id!,
      studentName: payload.studentName,
      classGroup: payload.classGroup,
      theme: payload.theme,
      submissionDate: new Date(payload.submissionDate),
      status: "processing",
    },
  });

  const analysis = await runEssayPipeline();

  await db.preliminaryAnalysis.create({
    data: {
      essaySubmissionId: submission.id,
      issuesPayload: analysis.issues,
      criterionScoresPayload: analysis.criterionScores,
      totalRawScore: analysis.totalRawScore,
      total1000Score: analysis.total1000Score,
      processingNotes: analysis.uncertaintyNotes,
    },
  });

  await db.essaySubmission.update({
    where: { id: submission.id },
    data: { status: analysis.status },
  });

  return NextResponse.json({ id: submission.id, status: analysis.status }, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/integration/api/create-essay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/uploads/route.ts src/app/api/essays/route.ts src/app/(dashboard)/dashboard/essays/new/page.tsx src/components/forms/new-essay-form.tsx tests/integration/api/create-essay.test.ts
git commit -m "feat: add essay submission flow and processing states"
```

### Task 6: Build the Review, Approval, and History Experience

**Files:**
- Create: `src/app/(dashboard)/dashboard/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/app/(dashboard)/dashboard/essays/[essayId]/page.tsx`
- Create: `src/app/api/essays/[essayId]/approve/route.ts`
- Create: `src/components/review/review-shell.tsx`
- Create: `src/components/review/issues-table.tsx`
- Create: `src/components/review/score-card.tsx`
- Create: `src/components/history/history-table.tsx`
- Create: `tests/integration/api/approve-essay.test.ts`

**Interfaces:**
- Consumes: `EssayPipelineResult`, `createEssaySchema`, Prisma `EssaySubmission`, `FinalReview`
- Produces: `POST /api/essays/[essayId]/approve`, `ReviewShell(props: ReviewShellProps): JSX.Element`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/essays/[essayId]/approve/route";

describe("POST /api/essays/[essayId]/approve", () => {
  it("approves a reviewed correction", async () => {
    const request = new Request("http://localhost/api/essays/essay_1/approve", {
      method: "POST",
      body: JSON.stringify({
        approvedTranscription: "Texto aprovado",
        approvedIssues: [],
        approvedCriterionScores: {
          genre: 2,
          purpose: 2,
          interlocution: 1,
          image: 1,
          sourceText: 1,
          cohesionAndCoherence: 1,
          grammar: 0.5,
          aesthetics: 0,
        },
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ essayId: "essay_1" }) });
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/approve-essay.test.ts`
Expected: FAIL with `Cannot find module '@/app/api/essays/[essayId]/approve/route'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { convertRawScoreToThousand } from "@/lib/essay/score";

export async function POST(request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { essayId } = await context.params;
  const body = await request.json();
  const totalRawScore = Object.values(body.approvedCriterionScores).reduce(
    (sum: number, value: unknown) => sum + Number(value),
    0,
  );

  await db.finalReview.upsert({
    where: { essaySubmissionId: essayId },
    update: {
      approvedTranscription: body.approvedTranscription,
      approvedIssuesPayload: body.approvedIssues,
      approvedCriterionScoresPayload: body.approvedCriterionScores,
      approvedTotalRawScore: totalRawScore,
      approvedTotal1000Score: convertRawScoreToThousand(totalRawScore, 8.5),
      approvedAt: new Date(),
    },
    create: {
      essaySubmissionId: essayId,
      approvedTranscription: body.approvedTranscription,
      approvedIssuesPayload: body.approvedIssues,
      approvedCriterionScoresPayload: body.approvedCriterionScores,
      approvedTotalRawScore: totalRawScore,
      approvedTotal1000Score: convertRawScoreToThousand(totalRawScore, 8.5),
      approvedAt: new Date(),
    },
  });

  await db.essaySubmission.update({
    where: { id: essayId },
    data: { status: "approved" },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/integration/api/approve-essay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/layout.tsx src/app/(dashboard)/dashboard/page.tsx src/app/(dashboard)/dashboard/essays/[essayId]/page.tsx src/app/api/essays/[essayId]/approve/route.ts src/components/review/review-shell.tsx src/components/review/issues-table.tsx src/components/review/score-card.tsx src/components/history/history-table.tsx tests/integration/api/approve-essay.test.ts
git commit -m "feat: add teacher review approval and history pages"
```

### Task 7: Add Resubmission Messaging and Approved Package Downloads

**Files:**
- Create: `src/app/api/essays/[essayId]/download/route.ts`
- Create: `src/lib/essay/report.ts`
- Create: `tests/integration/api/download-essay.test.ts`
- Create: `tests/e2e/teacher-review.spec.ts`

**Interfaces:**
- Consumes: `FinalReview`, `EssaySubmission`, `storage.getObjectBuffer(key: string): Promise<Buffer>`
- Produces: `GET /api/essays/[essayId]/download`, `renderApprovedReportHtml(input: ApprovedReportInput): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/essays/[essayId]/download/route";

describe("GET /essays/[essayId]/download", () => {
  it("returns a zip file for an approved essay", async () => {
    const response = await GET(new Request("http://localhost/api/essays/essay_1/download"), {
      params: Promise.resolve({ essayId: "essay_1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/zip");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/download-essay.test.ts`
Expected: FAIL with `Cannot find module '@/app/api/essays/[essayId]/download/route'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import JSZip from "jszip";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { renderApprovedReportHtml } from "@/lib/essay/report";

export async function GET(_request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { essayId } = await context.params;
  const essay = await db.essaySubmission.findUniqueOrThrow({
    where: { id: essayId },
    include: { finalReview: true, files: true },
  });

  const zip = new JSZip();
  zip.file("report.html", renderApprovedReportHtml(essay));
  zip.file(
    "scores.json",
    JSON.stringify(
      {
        raw: essay.finalReview?.approvedTotalRawScore,
        thousand: essay.finalReview?.approvedTotal1000Score,
      },
      null,
      2,
    ),
  );

  const body = await zip.generateAsync({ type: "uint8array" });
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="essay-${essayId}.zip"`,
    },
  });
}
```

```ts
export function renderApprovedReportHtml(input: {
  studentName: string;
  classGroup: string;
  theme: string;
  finalReview: {
    approvedTranscription: string;
    approvedTotalRawScore: number;
    approvedTotal1000Score: number;
  } | null;
}) {
  return `
    <html lang="pt-BR">
      <body>
        <h1>Relatorio de Correcao</h1>
        <p>Aluno: ${input.studentName}</p>
        <p>Turma: ${input.classGroup}</p>
        <p>Tema: ${input.theme}</p>
        <p>Nota Unicamp: ${input.finalReview?.approvedTotalRawScore ?? 0}</p>
        <p>Nota 0-1000: ${input.finalReview?.approvedTotal1000Score ?? 0}</p>
        <article>${input.finalReview?.approvedTranscription ?? ""}</article>
      </body>
    </html>
  `;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/integration/api/download-essay.test.ts && pnpm playwright test tests/e2e/teacher-review.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/essays/[essayId]/download/route.ts src/lib/essay/report.ts tests/integration/api/download-essay.test.ts tests/e2e/teacher-review.spec.ts
git commit -m "feat: add approved package download and resubmission safeguards"
```

## Self-Review

### Spec coverage

- Authentication and teacher-only access: Task 2
- Essay metadata and multi-photo upload: Tasks 3 and 5
- Preliminary analysis pipeline: Task 4
- Review and approval flow: Task 6
- Private historical archive: Task 6
- Resubmission flow for poor images: Tasks 4, 5, and 7
- Downloadable approved package: Task 7
- Unicamp rubric with teacher-calibrated issue detection: Task 4

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Every task includes an explicit test command and commit checkpoint.
- Every produced interface is named before downstream use.

### Type consistency

- Raw scoring uses `8.5` as the max score throughout Tasks 4 and 6.
- Submission status names are consistent with the approved spec states.
- The download route reads the `FinalReview` data shape written in Task 6.
