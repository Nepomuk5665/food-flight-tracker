# Push Notifications for Recalled Products

## TL;DR

> **Quick Summary**: Add Web Push notifications so consumers who scanned a product get alerted when that product is recalled. Permission is requested on first consumer app visit via a custom prompt. Scans are tracked server-side so the recall pipeline can find affected devices.
>
> **Deliverables**:
> - Service worker handling push events + notification click routing
> - Push subscription API (subscribe/unsubscribe)
> - Server-side scan recording (fire-and-forget from product page)
> - Recall → notification pipeline (recall created → find affected devices → Web Push)
> - Custom notification permission prompt in consumer layout
> - VAPID key generation script
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: DB tables → VAPID + SW → Subscribe API → Scan recording → Recall events → Notification sender → Permission UI

---

## Context

### Original Request
User wants push notifications when products they've scanned get recalled. Permission should be requested when clicking into the consumer app.

### Interview Summary
**Key Decisions**:
- Notifications only for recall events (not reports, anomalies, or status changes)
- Web Push API with VAPID keys (no user accounts needed)
- Device identity via existing `deviceId` in localStorage (`fft-device-id`)
- Scan tracking moves from client-only (localStorage) to also server-side (new DB table)

**Research Findings**:
- Recall flow: `POST /api/recalls` → `createRecall()` → updates batches to "recalled"
- Existing pub/sub pattern: `report-events.ts` with `onReportCreated`/`emitReportCreated` on `globalThis`
- DB: SQLite via Drizzle ORM, 8 tables, auto-created via `ensureTables()` in `db/index.ts`
- No service worker exists yet. `manifest.json` is PWA-ready
- Consumer entry: Landing → DeviceGate → `/scan` → MobileGate → Consumer layout

### Metis Review
**Identified Gaps** (addressed):
- barcode→lotCode gap: Scans store barcode, recalls target lotCodes. Resolved by querying `barcode → products → batches → recallLots` (notify all devices that scanned the product, not just a specific lot — safer for consumers)
- iOS limitation: Push only works for PWAs added to Home Screen on iOS. Accepted — permission prompt simply won't show on unsupported browsers
- Notification volume: Synchronous delivery with per-send error isolation (try/catch). No queue needed at current scale
- Permission timing: Custom in-app prompt before native dialog to prevent "denied forever"
- Event emission location: In API route handler, NOT inside `createRecall()` — mirrors `report-events.ts` pattern

---

## Work Objectives

### Core Objective
When a product is recalled, every device that previously scanned that product receives a browser push notification linking to the product page.

### Concrete Deliverables
- `src/lib/db/schema.ts` — 2 new tables: `pushSubscriptions`, `deviceScans`
- `src/lib/db/index.ts` — `ensureTables()` updated with CREATE TABLE IF NOT EXISTS
- `scripts/generate-vapid.mjs` — VAPID key generation script
- `public/sw.js` — Service worker for push + notification click
- `src/app/api/push/subscribe/route.ts` — Subscribe/unsubscribe endpoint
- `src/app/api/scans/route.ts` — Device scan recording endpoint
- `src/lib/recall-events.ts` — Pub/sub for recall creation events
- `src/lib/push/send-notifications.ts` — Find affected devices + send Web Push
- `src/components/notification-prompt.tsx` — Custom permission UI
- Updated `src/app/api/recalls/route.ts` — Emit recall event after creation
- Updated `src/app/(consumer)/product/[barcode]/save-to-history.tsx` — Fire-and-forget scan recording
- Updated `src/app/(consumer)/layout.tsx` — Mount notification prompt + register SW

### Definition of Done
- [ ] `curl POST /api/push/subscribe` returns 201 with subscription ID
- [ ] `curl POST /api/scans` records device scan in SQLite
- [ ] Triggering recall from QA dashboard sends push to devices that scanned affected product
- [ ] Service worker shows notification with product name + recall reason
- [ ] Clicking notification opens `/product/[barcode]`
- [ ] Permission prompt appears once, remembers dismissal/denial

### Must Have
- VAPID keys in `.env.local` (private) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public)
- Service worker at root scope (`/sw.js`)
- Custom prompt before native permission dialog
- Fire-and-forget scan recording (never blocks product page)
- 410 Gone cleanup (delete stale subscriptions)
- One notification per recall per device (deduplicated by deviceId)

### Must NOT Have (Guardrails)
- No user accounts, authentication, or login
- No offline caching, background sync, or SW features beyond push
- No notification inbox, read/unread tracking, or delivery status
- No email, SMS, or in-app toast notifications
- No admin UI for sending manual notifications
- No Drizzle migrations — use `ensureTables()` pattern only
- Do NOT call `Notification.requestPermission()` without showing custom UI first
- Do NOT emit recall events inside `createRecall()` in queries.ts — emit in API route only
- Do NOT block product page load on scan recording POST

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (tests-after for API routes, unit tests for event system + notification query)
- **Framework**: vitest

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent):
├── Task 1: DB schema + ensureTables (push_subscriptions, device_scans) [quick]
├── Task 2: VAPID key generation script + .env config [quick]
├── Task 3: Service worker (push handler + notification click) [unspecified-high]
├── Task 4: Recall events pub/sub module [quick]

Wave 2 (API + Integration — depends on Wave 1):
├── Task 5: Push subscription API route (depends: 1) [unspecified-high]
├── Task 6: Device scan recording API route (depends: 1) [quick]
├── Task 7: Notification sender — find affected devices + Web Push (depends: 1, 4) [deep]

Wave 3 (Client Integration — depends on Wave 2):
├── Task 8: Notification permission prompt component (depends: 2, 3, 5) [unspecified-high]
├── Task 9: Integrate scan recording into product page (depends: 6) [quick]
├── Task 10: Wire recall event emission into POST /api/recalls (depends: 4, 7) [quick]

Wave FINAL (Verification — after ALL tasks):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
├── F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 5 → Task 8 (subscription flow)
                Task 1 → Task 7 → Task 10 (notification pipeline)
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 5, 6, 7 |
| 2 | — | 8 |
| 3 | — | 8 |
| 4 | — | 7, 10 |
| 5 | 1 | 8 |
| 6 | 1 | 9 |
| 7 | 1, 4 | 10 |
| 8 | 2, 3, 5 | — |
| 9 | 6 | — |
| 10 | 4, 7 | — |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 `quick`, T2 `quick`, T3 `unspecified-high`, T4 `quick`
- **Wave 2**: 3 tasks — T5 `unspecified-high`, T6 `quick`, T7 `deep`
- **Wave 3**: 3 tasks — T8 `unspecified-high`, T9 `quick`, T10 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [ ] 1. DB Schema — Add push_subscriptions and device_scans tables

  **What to do**:
  - Add `pushSubscriptions` table to `src/lib/db/schema.ts`: `id` (PK, defaultId), `deviceId` (text, NOT NULL), `endpoint` (text, NOT NULL, UNIQUE), `auth` (text, NOT NULL), `p256dh` (text, NOT NULL), `createdAt` (text, nowIso)
  - Add `deviceScans` table to `src/lib/db/schema.ts`: `id` (PK, defaultId), `deviceId` (text, NOT NULL), `barcode` (text, NOT NULL), `scannedAt` (text, nowIso). Add unique constraint on `(deviceId, barcode)` for upsert
  - Update `ensureTables()` in `src/lib/db/index.ts` with `CREATE TABLE IF NOT EXISTS` for both tables
  - Add query helpers in `src/lib/db/queries.ts`: `upsertPushSubscription()`, `deletePushSubscription()`, `getSubscriptionsForDevices()`, `recordDeviceScan()`, `getDeviceIdsByBarcode()`

  **Must NOT do**: No Drizzle migrations. No FK from deviceScans to products.

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 1 | Blocks: 5, 6, 7 | Blocked By: None

  **References**:
  - `src/lib/db/schema.ts` — Follow `consumerReports` (line 97) for deviceId column pattern
  - `src/lib/db/index.ts:16-75` — `ensureTables()` with CREATE TABLE IF NOT EXISTS
  - `src/lib/db/queries.ts:389-432` — Query pattern examples

  **QA Scenarios**:
  ```
  Scenario: Tables created on startup
    Tool: Bash
    Steps:
      1. curl http://localhost:3000/api/product/4012345678901 to trigger DB init
      2. sqlite3 data/trace.db ".tables"
      3. Assert output contains "push_subscriptions" and "device_scans"
    Evidence: .sisyphus/evidence/task-1-tables.txt
  ```
  **Commit**: `feat(db): add push_subscriptions and device_scans tables`

- [ ] 2. VAPID Key Generation Script + Env Config

  **What to do**:
  - `bun add web-push`
  - Create `scripts/generate-vapid.mjs` using `web-push.generateVAPIDKeys()`
  - Update `.env.example` with `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - Run script, add keys to `.env.local`

  **Must NOT do**: No `https://localhost` as VAPID subject. No committing real keys.

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 1 | Blocks: 8 | Blocked By: None

  **References**:
  - `scripts/seed.ts` — Script pattern
  - `.env.local` — Existing env vars

  **QA Scenarios**:
  ```
  Scenario: Keys generated
    Tool: Bash
    Steps:
      1. node scripts/generate-vapid.mjs
      2. Assert output contains VAPID_PUBLIC_KEY= and VAPID_PRIVATE_KEY=
    Evidence: .sisyphus/evidence/task-2-vapid.txt
  ```
  **Commit**: `feat(push): add VAPID key generation script`

- [ ] 3. Service Worker — Push + Click Handlers

  **What to do**:
  - Create `public/sw.js`: handle `push` (showNotification), `notificationclick` (openWindow), `install` (skipWaiting), `activate` (clients.claim)
  - Notification payload: `{title, body, url, icon}`

  **Must NOT do**: No fetch interception. No offline caching. No background sync. Plain JS only.

  **Recommended Agent Profile**: `unspecified-high`, Skills: []
  **Parallelization**: Wave 1 | Blocks: 8 | Blocked By: None

  **References**:
  - `public/manifest.json` — PWA manifest

  **QA Scenarios**:
  ```
  Scenario: SW registers
    Tool: Playwright
    Steps:
      1. Navigate to /scan
      2. page.evaluate(() => navigator.serviceWorker.register('/sw.js'))
      3. Assert registration succeeds
    Evidence: .sisyphus/evidence/task-3-sw.png
  ```
  **Commit**: `feat(push): add service worker`

- [ ] 4. Recall Events Pub/Sub Module

  **What to do**:
  - Create `src/lib/recall-events.ts` — EXACT copy of `report-events.ts` pattern with `RecallEvent` type, `onRecallCreated()`, `emitRecallCreated()`
  - `RecallEvent`: `{ recallId, reason, severity, lotCodes[], productName, barcode }`

  **Must NOT do**: No async emit. No imports from queries.ts.

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 1 | Blocks: 7, 10 | Blocked By: None

  **References**:
  - `src/lib/report-events.ts:1-32` — COPY THIS EXACT PATTERN

  **QA Scenarios**:
  ```
  Scenario: Emit/listen works
    Tool: Bash (bun test)
    Steps: Register listener, emit event, assert called with correct payload. Unsubscribe, emit again, assert NOT called.
    Evidence: .sisyphus/evidence/task-4-events.txt
  ```
  **Commit**: `feat(push): add recall events pub/sub`

- [ ] 5. Push Subscription API Route

  **What to do**:
  - Create `src/app/api/push/subscribe/route.ts`: POST (subscribe/upsert), DELETE (unsubscribe)
  - Validate `{deviceId, endpoint, keys: {p256dh, auth}}`

  **Recommended Agent Profile**: `unspecified-high`, Skills: []
  **Parallelization**: Wave 2 | Blocks: 8 | Blocked By: 1

  **References**:
  - `src/app/api/reports/route.ts` — Route pattern with validation

  **QA Scenarios**:
  ```
  Scenario: Subscribe + upsert
    Tool: Bash (curl)
    Steps: POST with valid body → 201. Same endpoint again → 200. Missing fields → 400.
    Evidence: .sisyphus/evidence/task-5-subscribe.txt
  ```
  **Commit**: `feat(push): add subscription API route`

- [ ] 6. Device Scan Recording API Route

  **What to do**:
  - Create `src/app/api/scans/route.ts`: POST accepts `{deviceId, barcode}`, calls `recordDeviceScan()`

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 2 | Blocks: 9 | Blocked By: 1

  **QA Scenarios**:
  ```
  Scenario: Record scan
    Tool: Bash (curl)
    Steps: POST → 201. sqlite3 query confirms row. Duplicate → 200 (upsert).
    Evidence: .sisyphus/evidence/task-6-scan.txt
  ```
  **Commit**: `feat(push): add scan recording API route`

- [ ] 7. Notification Sender — Affected Devices + Web Push

  **What to do**:
  - Create `src/lib/push/send-notifications.ts`: `sendRecallNotifications(event)` — query path: `barcode → device_scans.deviceId → push_subscriptions` → `web-push.sendNotification()` per subscription
  - Create `src/lib/push/config.ts`: `web-push.setVapidDetails()` with env vars
  - On 410 Gone: delete subscription. Wrap each send in try/catch.
  - Register as listener via `onRecallCreated(sendRecallNotifications)`

  **Must NOT do**: No retry on failure (except 410 cleanup). No queuing.

  **Recommended Agent Profile**: `deep`, Skills: []
  **Parallelization**: Wave 2 | Blocks: 10 | Blocked By: 1, 4

  **References**:
  - `src/lib/db/queries.ts` — Query path: `batches.lotCode → batches.productId → products.barcode → device_scans.barcode → device_scans.deviceId → push_subscriptions.deviceId`
  - `src/lib/recall-events.ts` — `onRecallCreated()` from Task 4

  **QA Scenarios**:
  ```
  Scenario: Notification sent to affected device
    Tool: Bash (bun test)
    Steps: Seed subscription + scan. Mock web-push. Call sendRecallNotifications(). Assert sendNotification called with correct subscription + payload.
    Evidence: .sisyphus/evidence/task-7-notification.txt

  Scenario: 410 cleanup
    Tool: Bash (bun test)
    Steps: Mock sendNotification → throw {statusCode: 410}. Assert subscription deleted from DB.
    Evidence: .sisyphus/evidence/task-7-stale.txt
  ```
  **Commit**: `feat(push): add notification sender on recall`

- [ ] 8. Permission Prompt + SW Registration in Consumer Layout

  **What to do**:
  - Create `src/components/notification-prompt.tsx` ("use client"): Check localStorage `fft:push-prompted`. Show custom banner "Get alerted if products you scan are recalled" with "Enable Alerts" + dismiss. On enable: `Notification.requestPermission()` → register SW → `pushManager.subscribe()` → POST `/api/push/subscribe`. Persist state.
  - Update `src/app/(consumer)/layout.tsx` — add `<NotificationPrompt />`

  **Must NOT do**: No native dialog without custom UI first. No prompt if `Notification` API unsupported.

  **Recommended Agent Profile**: `unspecified-high`, Skills: []
  **Parallelization**: Wave 3 | Blocked By: 2, 3, 5

  **References**:
  - `src/app/(consumer)/scan/page.tsx:280-328` — Camera permission gate UI pattern
  - `src/lib/device-id.ts` — `getDeviceId()`
  - `src/components/mobile-gate.tsx` — Gate pattern with localStorage

  **QA Scenarios**:
  ```
  Scenario: Prompt grants + persists
    Tool: Playwright
    Steps: Set permissions granted. Navigate /scan. Assert prompt visible. Click "Enable Alerts". Assert fft:push-prompted = "granted". Reload. Assert no prompt.
    Evidence: .sisyphus/evidence/task-8-granted.png

  Scenario: Dismiss persists
    Tool: Playwright
    Steps: Navigate /scan. Click dismiss. Assert fft:push-prompted = "dismissed". Reload. Assert no prompt.
    Evidence: .sisyphus/evidence/task-8-dismissed.png
  ```
  **Commit**: `feat(ui): add notification permission prompt`

- [ ] 9. Integrate Scan Recording into Product Page

  **What to do**:
  - Update `src/app/(consumer)/product/[barcode]/save-to-history.tsx`: After `addToScanHistory()`, fire-and-forget `fetch("/api/scans", {method:"POST", body: JSON.stringify({deviceId: getDeviceId(), barcode})})` in try/catch

  **Must NOT do**: No await. No error UI. No change to existing localStorage behavior.

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 3 | Blocked By: 6

  **References**:
  - `src/app/(consumer)/product/[barcode]/save-to-history.tsx` — Add fetch after `addToScanHistory()`
  - `src/lib/device-id.ts` — `getDeviceId()`

  **QA Scenarios**:
  ```
  Scenario: Scan recorded on product visit
    Tool: Playwright
    Steps: Navigate /product/4012345678901. Wait 2s. sqlite3 query device_scans. Assert row exists.
    Evidence: .sisyphus/evidence/task-9-recorded.png
  ```
  **Commit**: `feat(push): record scans server-side from product page`

- [ ] 10. Wire Recall Event Emission into POST /api/recalls

  **What to do**:
  - Update `src/app/api/recalls/route.ts` POST handler: after `createRecall()`, look up product name + barcode from lotCodes, call `emitRecallCreated({recallId, reason, severity, lotCodes, productName, barcode})` in try/catch
  - Ensure notification listener is registered (side-effect import of send-notifications module)

  **Must NOT do**: No modification to `createRecall()` in queries.ts. No waiting for notification delivery.

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 3 | Blocked By: 4, 7

  **References**:
  - `src/app/api/recalls/route.ts:10-38` — Add emit after createRecall()
  - `src/app/api/reports/route.ts:77` — `try { emitReportCreated({...}) } catch {}` — COPY THIS PATTERN

  **QA Scenarios**:
  ```
  Scenario: Full pipeline
    Tool: Bash
    Preconditions: Device with subscription + scan for barcode 4012345678901
    Steps: POST /api/recalls with lotCode L6029479302. Assert 200. Check logs for notification dispatch.
    Evidence: .sisyphus/evidence/task-10-pipeline.txt

  Scenario: Recall with no scanned devices
    Tool: Bash
    Steps: POST /api/recalls with unscanned lot. Assert 200. No errors.
    Evidence: .sisyphus/evidence/task-10-no-devices.txt
  ```
  **Commit**: `feat(push): emit recall events from recalls API`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: denied permission, stale subscription, scan without network. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read spec, read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `feat(db): add push_subscriptions and device_scans tables` | schema.ts, index.ts | `bun test` |
| 2 | `feat(push): add VAPID key generation script` | scripts/generate-vapid.mjs, .env.example | script runs |
| 3 | `feat(push): add service worker with push + click handlers` | public/sw.js | SW registers |
| 4 | `feat(push): add recall events pub/sub` | recall-events.ts | unit test |
| 5 | `feat(push): add subscription API route` | api/push/subscribe/route.ts, queries.ts | curl test |
| 6 | `feat(push): add device scan recording API route` | api/scans/route.ts, queries.ts | curl test |
| 7 | `feat(push): add notification sender on recall` | push/send-notifications.ts | unit test |
| 8 | `feat(ui): add notification permission prompt` | notification-prompt.tsx, consumer layout | playwright |
| 9 | `feat(push): record scans server-side from product page` | save-to-history.tsx | network fires |
| 10 | `feat(push): emit recall events from recalls API` | api/recalls/route.ts | integration test |

---

## Success Criteria

### Verification Commands
```bash
# Tables exist
sqlite3 data/trace.db ".tables" # Expected: push_subscriptions device_scans in list

# Subscribe
curl -s -X POST http://localhost:3000/api/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","endpoint":"https://test.push/abc","keys":{"p256dh":"test-key","auth":"test-auth"}}' | jq .success
# Expected: true

# Record scan
curl -s -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","barcode":"4012345678901"}' | jq .success
# Expected: true

# Service worker registered
# Playwright: page.evaluate(() => navigator.serviceWorker.ready.then(r => r.active?.state))
# Expected: "activated"
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Push notification received after recall trigger
- [ ] Permission prompt shows once, remembers state
- [ ] Scan recording doesn't delay product page load
