# Consumer Incident Report — Product Detail Page

## TL;DR

> **Quick Summary**: Add a "Report Issue" feature to the consumer product detail page. A floating danger button triggers a full-screen bottom sheet with a 3-step wizard: emoji category cards → description + optional photo → animated success confirmation. Photos stored as compressed base64 in SQLite (MVP). API with rate limiting.
>
> **Deliverables**:
> - `POST /api/reports` endpoint with validation + rate limiting
> - `ReportSheet` bottom sheet component (3-step animated wizard)
> - Report trigger button on product detail page (only when lot exists)
> - Device ID utility (localStorage UUID)
> - Client-side image compression utility
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 5 → Task 6 → Task 7

---

## Context

### Original Request
"Can you make on the detail product page that you can report an incident? Don't make the UI in the QA Dashboard yet. Just make the Consumer App UI now. Make a crazy UX."

### Interview Summary
**Key Discussions**:
- Consumer App UI only — no QA Dashboard changes
- "Crazy UX" — polished animations, native-feeling multi-step wizard, haptic feedback, celebration on submit

**Research Findings**:
- `consumerReports` table already exists in schema: `id, lotCode, batchId, deviceId, category, description, photoUrl, status, createdAt`
- Query functions already exist: `createConsumerReport()`, `getReportsForLot()`, `getReportCountForDevice()`
- `ReportCategory` type defined in `src/lib/types.ts:11-17`: `taste_quality | appearance | packaging | foreign_object | allergic_reaction | other`
- **No API route** for consumer reports exists yet
- **No consumer UI** for reporting exists yet
- **No file upload infrastructure** — photoUrl field exists but nothing stores files

### Metis Review
**Identified Gaps** (addressed):
- **Photo storage gap**: No upload infra. Resolved: base64 data URL in SQLite for MVP (compress client-side to <200KB)
- **Rate limiting bug**: `getReportCountForDevice()` calculates `since` timestamp but never uses it in WHERE clause. Resolved: fix as first task
- **activeLot null**: Products from OpenFoodFacts only have no lot. Resolved: hide report button when no lot
- **Category labels**: Schema has code strings, need user-facing emoji+label mapping. Resolved: define in ReportSheet component

---

## Work Objectives

### Core Objective
Enable consumers to report food safety issues directly from the product detail page with a delightful, native-feeling multi-step form.

### Concrete Deliverables
- `POST /api/reports` API endpoint
- `src/lib/device-id.ts` — deviceId generation + persistence
- `src/lib/image-utils.ts` — client-side photo compression
- `src/components/product/ReportSheet.tsx` — full-screen bottom sheet wizard
- Modified `ProductTabs.tsx` — report trigger button integration

### Definition of Done
- [ ] `curl -X POST /api/reports` returns 201 with valid payload
- [ ] Rate limiting returns 429 on 6th request within 1 hour
- [ ] Report button visible only when activeLot exists
- [ ] 3-step wizard completes: category → description+photo → success
- [ ] Photos compressed to <200KB before submission
- [ ] All existing tests pass (`pnpm test`)

### Must Have
- Category selection with emoji icons (6 categories from ReportCategory type)
- Optional text description
- Optional photo capture (camera or gallery)
- Client-side photo compression before upload
- Rate limiting (max 5 reports per device per hour)
- Haptic feedback on category select + submit
- Animated transitions between wizard steps
- Success celebration animation
- Device ID persistence in localStorage

### Must NOT Have (Guardrails)
- ❌ QA Dashboard UI changes
- ❌ Report viewing/listing/history for consumers
- ❌ Push notifications for report status
- ❌ AI analysis of report photos
- ❌ Image cropping/editing UI
- ❌ A 4th tab in the product page (use bottom sheet overlay, not tab)
- ❌ External file storage (S3, R2) — base64 in DB for MVP
- ❌ New categories beyond the 6 in ReportCategory
- ❌ Reports when activeLot is null
- ❌ Modifications to existing components (ProductInfo, MapTab, AiInsights) beyond adding trigger

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: YES (tests-after)
- **Framework**: Vitest (already configured, 138 tests passing)

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **Library/Module**: Use Bash (bun/node) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, MAX PARALLEL):
├── Task 1: Fix rate limiting bug in queries.ts [quick]
├── Task 2: POST /api/reports endpoint [quick]
├── Task 3: Device ID utility [quick]
├── Task 4: Image compression utility [quick]

Wave 2 (After Wave 1 — core UI):
├── Task 5: ReportSheet bottom sheet component [visual-engineering]

Wave 3 (After Wave 2 — integration + polish):
├── Task 6: Integrate report button into ProductTabs [quick]
├── Task 7: Animations, haptic, success celebration [visual-engineering]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2 |
| 2 | 1 | 5, 6 |
| 3 | — | 5 |
| 4 | — | 5 |
| 5 | 2, 3, 4 | 6, 7 |
| 6 | 5 | 7 |
| 7 | 6 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **1 task** — T5 → `visual-engineering`
- **Wave 3**: **2 tasks** — T6 → `quick`, T7 → `visual-engineering`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Fix rate limiting bug in getReportCountForDevice

  **What to do**:
  - In `src/lib/db/queries.ts`, the `getReportCountForDevice()` function calculates a `since` timestamp but never uses it in the WHERE clause
  - Add `and()` from drizzle-orm to combine `eq(consumerReports.deviceId, deviceId)` with `gte(consumerReports.createdAt, sinceIso)` where `sinceIso = since.toISOString()`
  - Import `and`, `gte` from `drizzle-orm` (add to existing import)
  - Write a test in `tests/report-rate-limit.test.ts` that verifies the query only counts reports within the time window

  **Must NOT do**:
  - Change the function signature or default parameter
  - Touch any other query functions

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/lib/db/queries.ts:295-306` — the buggy function (calculates `since` but doesn't use it)
  - `src/lib/db/queries.ts:1` — existing drizzle-orm imports (`eq, desc, asc, sql`) — add `and, gte`
  - `src/lib/db/schema.ts:100-110` — `consumerReports` table schema

  **Acceptance Criteria**:
  - [ ] `getReportCountForDevice("device-x", 1)` returns 0 when all reports from "device-x" are older than 1 hour
  - [ ] `getReportCountForDevice("device-x", 1)` returns N when N reports exist within the last hour
  - [ ] `pnpm test` passes with no regressions

  **QA Scenarios**:
  ```
  Scenario: Rate limit counts only recent reports
    Tool: Bash (pnpm test)
    Preconditions: Test file tests/report-rate-limit.test.ts exists
    Steps:
      1. Run `pnpm test tests/report-rate-limit.test.ts`
      2. Assert all tests pass
    Expected Result: All assertions pass, function correctly filters by time window
    Evidence: .sisyphus/evidence/task-1-rate-limit-fix.txt

  Scenario: Existing tests not broken
    Tool: Bash (pnpm test)
    Steps:
      1. Run `pnpm test`
      2. Assert 138+ tests pass, 0 failures
    Expected Result: All existing tests pass
    Evidence: .sisyphus/evidence/task-1-no-regression.txt
  ```

  **Commit**: YES
  - Message: `fix: add time window filter to getReportCountForDevice`
  - Files: `src/lib/db/queries.ts`, `tests/report-rate-limit.test.ts`
  - Pre-commit: `pnpm test`

- [ ] 2. POST /api/reports endpoint with validation and rate limiting

  **What to do**:
  - Create `src/app/api/reports/route.ts` with a POST handler
  - Validate required fields: `lotCode` (string), `deviceId` (string), `category` (must be one of the 6 ReportCategory values)
  - Optional fields: `description` (string, max 500 chars), `photoUrl` (string, base64 data URL)
  - Rate limit: call `getReportCountForDevice(deviceId, 1)` — if >= 5, return 429
  - On success: call `createConsumerReport()` and return `{ success: true, data: { reportId, status: "new" } }` with HTTP 201
  - Follow exact response pattern from `src/app/api/recalls/route.ts`
  - Write tests in `tests/reports-api.test.ts`

  **Must NOT do**:
  - Accept categories outside the ReportCategory enum
  - Allow requests without lotCode or deviceId
  - Skip rate limiting

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (within Wave 1, after Task 1 completes)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `src/app/api/recalls/route.ts:9-37` — POST handler pattern (validation, response format, error codes)
  - `src/lib/db/queries.ts:261-276` — `createConsumerReport()` function signature and behavior
  - `src/lib/db/queries.ts:295-306` — `getReportCountForDevice()` for rate limiting
  - `src/lib/types.ts:11-17` — `ReportCategory` type with exact 6 values
  - `src/lib/db/schema.ts:100-110` — `consumerReports` table (lotCode, deviceId, category, description, photoUrl, status)
  - `node_modules/next/dist/docs/` — Read Next.js docs for API route conventions (per AGENTS.md)

  **Acceptance Criteria**:
  - [ ] POST with valid payload returns 201 + `{ success: true, data: { reportId: "uuid", status: "new" } }`
  - [ ] POST missing lotCode returns 400 + `INVALID_INPUT`
  - [ ] POST missing deviceId returns 400 + `INVALID_INPUT`
  - [ ] POST with invalid category returns 400 + `INVALID_CATEGORY`
  - [ ] POST with description > 500 chars returns 400
  - [ ] 6th POST from same deviceId within 1 hour returns 429 + `RATE_LIMIT_EXCEEDED`
  - [ ] `pnpm test` passes

  **QA Scenarios**:
  ```
  Scenario: Valid report submission
    Tool: Bash (curl)
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"lotCode":"L6029479302","deviceId":"qa-test-device","category":"taste_quality","description":"Tastes metallic"}'
      2. Assert HTTP status is 201
      3. Assert response contains "success":true and "reportId"
    Expected Result: 201 with reportId in response
    Evidence: .sisyphus/evidence/task-2-valid-submit.txt

  Scenario: Missing required fields rejected
    Tool: Bash (curl)
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"lotCode":"L6029479302"}'
      2. Assert HTTP status is 400
      3. Assert response contains "INVALID_INPUT"
    Expected Result: 400 with INVALID_INPUT error
    Evidence: .sisyphus/evidence/task-2-missing-fields.txt

  Scenario: Invalid category rejected
    Tool: Bash (curl)
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"lotCode":"L6029479302","deviceId":"d","category":"banana_smell"}'
      2. Assert HTTP status is 400
      3. Assert response contains "INVALID_CATEGORY"
    Expected Result: 400 with INVALID_CATEGORY error
    Evidence: .sisyphus/evidence/task-2-invalid-category.txt
  ```

  **Commit**: YES
  - Message: `feat: add POST /api/reports endpoint with validation and rate limiting`
  - Files: `src/app/api/reports/route.ts`, `tests/reports-api.test.ts`
  - Pre-commit: `pnpm test`

- [ ] 3. Device ID utility with localStorage persistence

  **What to do**:
  - Create `src/lib/device-id.ts` with a single exported function `getDeviceId(): string`
  - On first call: generate UUID v4 via `crypto.randomUUID()`, store in `localStorage` under key `fft-device-id`, return it
  - On subsequent calls: return stored value from localStorage
  - Handle SSR gracefully (return empty string if `typeof window === "undefined"`)

  **Must NOT do**:
  - Use external UUID libraries
  - Store in cookies or session storage

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `src/lib/scan-history.ts` — existing localStorage pattern in this codebase (get/set with JSON parse/stringify)
  - `src/app/(consumer)/scan/page.tsx:10` — `GATE_STORAGE_KEY` pattern for localStorage key naming

  **Acceptance Criteria**:
  - [ ] `getDeviceId()` returns a valid UUID string
  - [ ] Calling twice returns the same value
  - [ ] Value persists in localStorage under `fft-device-id`

  **QA Scenarios**:
  ```
  Scenario: Generates and persists device ID
    Tool: Bash
    Steps:
      1. Run `pnpm test tests/device-id.test.ts`
      2. Assert exit code 0, all tests pass
    Expected Result: Tests confirm: first call generates UUID, second call returns same value, localStorage key `fft-device-id` is set
    Evidence: .sisyphus/evidence/task-3-device-id.txt
  ```

  Note: Write test file `tests/device-id.test.ts` as part of this task.

  **Commit**: YES (groups with Task 4)
  - Message: `feat: add deviceId + image compression utilities`
  - Files: `src/lib/device-id.ts`, `src/lib/image-utils.ts`, `tests/device-id.test.ts`, `tests/image-utils.test.ts`
  - Pre-commit: `pnpm test`

- [ ] 4. Client-side image compression utility

  **What to do**:
  - Create `src/lib/image-utils.ts` with exported function `compressImage(file: File, maxDimension?: number, quality?: number): Promise<string>`
  - Default: maxDimension = 800px, quality = 0.8 (JPEG)
  - Use `createImageBitmap()` to load, draw onto `OffscreenCanvas` (or regular canvas), export as JPEG data URL
  - If resulting data URL is > 200KB, reduce quality by 0.1 and retry (min quality 0.3)
  - Return the base64 data URL string

  **Must NOT do**:
  - Use external image processing libraries
  - Upload images anywhere — only return data URL string
  - Add image cropping/editing UI

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `src/app/(consumer)/scan/page.tsx:92-119` — existing `createImageBitmap()` usage for barcode detection from uploaded image
  - `src/app/(consumer)/scan/page.tsx:251-263` — hidden file input pattern with `accept="image/*"`

  **Acceptance Criteria**:
  - [ ] Output is a valid `data:image/jpeg;base64,...` string
  - [ ] Output is ≤ 200KB
  - [ ] Large images (e.g., 4000x3000) are resized to max 800px on longest dimension

  **QA Scenarios**:
  ```
  Scenario: Compression produces valid data URL under size limit
    Tool: Bash
    Steps:
      1. Run `pnpm test tests/image-utils.test.ts`
      2. Assert exit code 0, all tests pass
    Expected Result: Tests confirm: output starts with "data:image/jpeg;base64,", output byte size ≤ 200KB, large images resized to max 800px
    Evidence: .sisyphus/evidence/task-4-image-compress.txt
  ```

  Note: Write test file `tests/image-utils.test.ts` as part of this task. Use mock canvas/bitmap APIs since Vitest runs in Node (no real browser canvas). Verify the logic of dimension calculation and quality reduction loop.

  **Commit**: YES (groups with Task 3)
  - Message: `feat: add deviceId + image compression utilities`
  - Files: `src/lib/device-id.ts`, `src/lib/image-utils.ts`
  - Pre-commit: `pnpm test`

- [ ] 5. ReportSheet bottom sheet component with multi-step wizard

  **What to do**:
  - Create `src/components/product/ReportSheet.tsx` as a client component
  - Props: `open: boolean`, `onClose: () => void`, `lotCode: string`, `barcode: string`, `productName: string`
  - Full-screen bottom sheet using the drag/velocity pattern from MapTab.tsx (touch + mouse events, snap positions)
  - **Step 1 — Category Selection**: 6 large tappable cards in 2x3 grid, each with emoji + label:
    - 🤢 Bad Taste (`taste_quality`)
    - 👀 Looks Wrong (`appearance`)
    - 📦 Packaging Issue (`packaging`)
    - 🔍 Foreign Object (`foreign_object`)
    - ⚠️ Allergic Reaction (`allergic_reaction`)
    - ❓ Other (`other`)
  - **Step 2 — Details**: Text area for description (optional, max 500 chars, character counter), photo capture button (hidden file input with `accept="image/*;capture=camera"`), photo preview with remove button, "Submit Report" button
  - **Step 3 — Success**: Animated checkmark, "Thank you" message, auto-close after 2 seconds or tap to close
  - Use Framer Motion `AnimatePresence` + `motion.div` for step transitions (slide left/right)
  - Call `POST /api/reports` on submit with lotCode, deviceId (from getDeviceId()), category, description, photoUrl (compressed base64)
  - Handle loading, error, and rate-limit states
  - Disable submit during request (prevent double-submit)
  - Show inline error message on failure, specific message on rate limit ("Too many reports. Try again later.")

  **Must NOT do**:
  - Create a 4th tab — this is a bottom sheet overlay
  - Add report viewing/listing
  - Use external form libraries (react-hook-form etc.)
  - Add image cropping/editing

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["playwright"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (solo)
  - **Blocks**: Task 6, Task 7
  - **Blocked By**: Tasks 2, 3, 4

  **References**:
  - `src/components/product/MapTab.tsx:28-110` — bottom sheet drag/velocity state management (handleDragStart/Move/End, snap logic)
  - `src/components/product/MapTab.tsx:192-228` — bottom sheet JSX (drag handle, rounded-t-[24px], backdrop blur, height transitions)
  - `src/app/(dashboard)/incidents/page.tsx:138-212` — Framer Motion AnimatePresence form expand pattern
  - `src/app/(consumer)/scan/page.tsx:251-263` — hidden file input with accept="image/*"
  - `src/app/(consumer)/scan/page.tsx:71` — haptic feedback: `navigator.vibrate?.(200)`
  - `src/lib/types.ts:11-17` — ReportCategory type (6 exact values)
  - `src/lib/device-id.ts` — getDeviceId() (from Task 3)
  - `src/lib/image-utils.ts` — compressImage() (from Task 4)
  - `src/app/globals.css:3-38` — design tokens: --color-primary #16A34A, --radius-xl 22px, etc.

  **Acceptance Criteria**:
  - [ ] Component renders when `open={true}`, hidden when `open={false}`
  - [ ] Step 1 shows 6 category cards, tapping one advances to step 2
  - [ ] Step 2 shows description textarea with character counter and photo button
  - [ ] Photo button opens camera/gallery, preview shows after capture
  - [ ] Submit button calls POST /api/reports with correct payload
  - [ ] Submit button is disabled during request
  - [ ] Step 3 shows success animation on 201 response
  - [ ] Rate limit error (429) shows "Too many reports" inline message
  - [ ] Back button on step 2 returns to step 1

  **QA Scenarios**:
  ```
  Scenario: Component file compiles and exports correctly
    Tool: Bash
    Steps:
      1. Run `pnpm exec tsc --noEmit src/components/product/ReportSheet.tsx`
      2. Assert exit code 0, no type errors
    Expected Result: Component type-checks cleanly against its props interface and all imports resolve
    Evidence: .sisyphus/evidence/task-5-typecheck.txt

  Scenario: API integration verified via curl (the endpoint this component calls)
    Tool: Bash (curl)
    Preconditions: Dev server running with seeded DB (`pnpm db:push && pnpm db:seed`)
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"lotCode":"L6029479302","deviceId":"sheet-test-device","category":"foreign_object","description":"Found something weird"}'
      2. Assert HTTP 201 with reportId in response
    Expected Result: Report created successfully via the API the component will call
    Evidence: .sisyphus/evidence/task-5-api-submit.txt

  Scenario: No regressions in existing test suite
    Tool: Bash
    Steps:
      1. Run `pnpm test`
      2. Assert all tests pass (138+), 0 failures
    Expected Result: No regressions from new component file
    Evidence: .sisyphus/evidence/task-5-no-regression.txt
  ```

  Note: Full interactive UI testing (clicking trigger button → step navigation → wizard completion) is deferred to **Task 6 QA** where the component is integrated into a real page and testable via Playwright. No component-level React testing infra (jsdom/happy-dom) exists in this repo, so component behavior is verified through type-checking + end-to-end Playwright in Task 6.

  **Commit**: YES
  - Message: `feat: add ReportSheet bottom sheet wizard component`
  - Files: `src/components/product/ReportSheet.tsx`
  - Pre-commit: `pnpm test`

- [ ] 6. Integrate report button into ProductTabs

  **What to do**:
  - In `src/app/(consumer)/product/[barcode]/ProductTabs.tsx`:
    - Add `useState<boolean>` for report sheet open state
    - Add a floating report trigger button (fixed position, bottom-right above nav, red/danger accent)
    - Button: circular, red background, exclamation mark or flag icon from lucide-react
    - Only render when `activeLot` is not null
    - On click: open ReportSheet with lotCode, barcode, productName
  - Import and render `<ReportSheet />` component conditionally

  **Must NOT do**:
  - Add a 4th tab to TabToggle
  - Modify ProductInfo, MapTab, or AiInsights components
  - Show report button when activeLot is null

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:
  - `src/app/(consumer)/product/[barcode]/ProductTabs.tsx:35-161` — full component, add state + button + ReportSheet
  - `src/components/product/ReportSheet.tsx` — the component from Task 5
  - `src/components/consumer-nav.tsx:46` — floating nav positioning (bottom-4, z-[70]) — report button must not overlap

  **Acceptance Criteria**:
  - [ ] Red floating button visible on product page when activeLot exists (e.g., barcode `4012345678901`)
  - [ ] Button NOT visible on product page when activeLot is null (e.g., any OpenFoodFacts-only barcode)
  - [ ] Tapping button opens ReportSheet bottom sheet
  - [ ] ReportSheet receives correct lotCode, barcode, productName

  **QA Scenarios**:
  ```
  Scenario: Report button visible with active lot
    Tool: Playwright
    Preconditions: Dev server running with seeded DB (`pnpm db:push && pnpm db:seed`)
    Steps:
      1. Navigate to /product/4012345678901 (Swiss Dark Chocolate — has activeLot)
      2. Assert element [data-testid="report-trigger"] exists and is visible
      3. Screenshot
    Expected Result: Red floating button visible in bottom-right area
    Evidence: .sisyphus/evidence/task-6-button-visible.png

  Scenario: Report button hidden without lot
    Tool: Playwright
    Preconditions: Dev server running with seeded DB (`pnpm db:push && pnpm db:seed`)
    Steps:
      1. Navigate to /product/3017624010701 (Nutella — OpenFoodFacts only, no lot)
      2. Assert element [data-testid="report-trigger"] does NOT exist in DOM
    Expected Result: No report button rendered
    Evidence: .sisyphus/evidence/task-6-button-hidden.png

  Scenario: Full end-to-end report submission via UI
    Tool: Playwright
    Preconditions: Dev server running with seeded DB (`pnpm db:push && pnpm db:seed`)
    Steps:
      1. Navigate to /product/4012345678901
      2. Click element [data-testid="report-trigger"]
      3. Assert bottom sheet is visible (contains category cards)
      4. Click the card with text "Bad Taste"
      5. Assert step 2 is visible (textarea, submit button)
      6. Type "Product tastes metallic and strange" into textarea
      7. Click submit button
      8. Assert success state appears (contains "Thank you" or checkmark)
    Expected Result: 3-step wizard completes end-to-end, report saved to DB
    Evidence: .sisyphus/evidence/task-6-full-flow.png
  ```

  **Commit**: YES
  - Message: `feat: integrate report button into product detail page`
  - Files: `src/app/(consumer)/product/[barcode]/ProductTabs.tsx`
  - Pre-commit: `pnpm test`

- [ ] 7. Animations, haptic feedback, and success celebration

  **What to do**:
  - Polish ReportSheet.tsx with:
    - **Bottom sheet entrance**: `motion.div` slide up from bottom with spring physics (`type: "spring", damping: 25, stiffness: 300`)
    - **Category cards**: Staggered entrance animation (each card fades in + scales up with 50ms delay between)
    - **Haptic on category select**: `navigator.vibrate?.(50)` — light tap
    - **Step transitions**: Slide left (step 1→2) and slide right (step 2→1) via AnimatePresence with x offset
    - **Submit button**: Pulse animation while loading, scale bounce on tap
    - **Success checkmark**: SVG path draw animation (stroke-dashoffset from full to 0), green circle scales up behind it
    - **Haptic on success**: `navigator.vibrate?.([50, 30, 100])` — pattern burst
    - **Confetti/particles**: Optional — CSS-only floating green dots that fade out (pure CSS keyframes, no library)
    - **Auto-close**: 2.5 second timer after success, then sheet slides down
  - Add report trigger button animation: subtle pulse/breathe animation to draw attention

  **Must NOT do**:
  - Add external animation libraries beyond Framer Motion (already installed)
  - Add sound effects
  - Make animations blocking or unskippable (user can always tap to close)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["playwright"]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 6

  **References**:
  - `src/app/globals.css:104-158` — existing keyframe animations (shimmer, blink, ai-sparkle-float, ai-wave) — add new ones here
  - `src/app/(dashboard)/incidents/page.tsx:138-212` — AnimatePresence + motion.div patterns with initial/animate/exit
  - `src/app/(consumer)/scan/page.tsx:71` — haptic: `navigator.vibrate?.(200)`
  - Framer Motion v12 — `motion.div`, `AnimatePresence`, `useAnimation`, spring transitions

  **Acceptance Criteria**:
  - [ ] Bottom sheet slides up with spring physics (not linear)
  - [ ] Category cards stagger in on sheet open
  - [ ] Haptic fires on category select (50ms) and success (pattern)
  - [ ] Steps slide left/right with AnimatePresence
  - [ ] Success shows animated checkmark (SVG draw)
  - [ ] Sheet auto-closes ~2.5s after success
  - [ ] Report trigger button has subtle attention animation

  **QA Scenarios**:
  ```
  Scenario: Animation flow visual verification
    Tool: Playwright
    Preconditions: Dev server running with seeded DB (`pnpm db:push && pnpm db:seed`)
    Steps:
      1. Navigate to /product/4012345678901
      2. Click report trigger button
      3. Screenshot after 500ms (category cards should be staggered in)
      4. Click "Bad Taste" category
      5. Screenshot (step 2 should have slid in from right)
      6. Type "Test report" and click Submit
      7. Screenshot after 500ms (success checkmark animation)
      8. Wait 3 seconds
      9. Assert bottom sheet is closed (height = 0 or not visible)
    Expected Result: Smooth animated flow with visible spring physics and stagger
    Evidence: .sisyphus/evidence/task-7-animation-flow.png
  ```

  **Commit**: YES
  - Message: `feat: add animations, haptic, and success celebration to report flow`
  - Files: `src/components/product/ReportSheet.tsx`, `src/app/globals.css`
  - Pre-commit: `pnpm test`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `fix: add time window filter to getReportCountForDevice` | `src/lib/db/queries.ts` | `pnpm test` |
| 2 | `feat: add POST /api/reports endpoint with validation` | `src/app/api/reports/route.ts`, `tests/reports-api.test.ts` | `pnpm test` |
| 3 | `feat: add deviceId + image compression utilities` | `src/lib/device-id.ts`, `src/lib/image-utils.ts` | `pnpm test` |
| 4 | `feat: add ReportSheet bottom sheet wizard component` | `src/components/product/ReportSheet.tsx` | `pnpm test` |
| 5 | `feat: integrate report button into product detail page` | `src/app/(consumer)/product/[barcode]/ProductTabs.tsx` | `pnpm test` |
| 6 | `feat: add animations, haptic, and success celebration` | `src/components/product/ReportSheet.tsx` | `pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
pnpm test  # Expected: all tests pass (140+)
curl -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"lotCode":"L6029479302","deviceId":"test-123","category":"taste_quality","description":"Tastes off"}'  # Expected: 201 + reportId
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Report flow works end-to-end on mobile
