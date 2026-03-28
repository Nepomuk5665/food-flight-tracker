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
