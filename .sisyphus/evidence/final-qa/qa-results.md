# Final Integration QA — Push Notifications

**Date:** 2026-03-28  
**Server:** localhost:3000

---

## Scenario Results

### 1. DB Tables Exist — PASS
```
$ sqlite3 data/trace.db ".tables"
batch_lineage       consumer_reports    push_subscriptions  stage_anomalies   
batch_stages        device_scans        recall_lots         telemetry_readings
batches             products            recalls           
```
Both `push_subscriptions` and `device_scans` confirmed present.

### 2. Subscribe API — new subscription → 201 — PASS
```
$ curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"qa-test","endpoint":"https://fcm.example/qa-test","keys":{"p256dh":"BNtest","auth":"authtest"}}'

{"success":true}
201
```

### 3. Subscribe API — duplicate → 200 (upsert) — PASS
```
(same curl)

{"success":true}
200
```

### 4. Subscribe API — missing fields → 400 — PASS
```
$ curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/push/subscribe \
  -H "Content-Type: application/json" -d '{}'

{"success":false,"error":"Missing required fields"}
400
```

### 5. Scan API — new scan → 201 — PASS
```
$ curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"qa-test","barcode":"4012345678901"}'

{"success":true}
201
```

### 6. Scan API — duplicate → 200 (upsert) — PASS
```
(same curl)

{"success":true}
200
```

### 7. Scan API — missing fields → 400 — PASS
```
$ curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" -d '{}'

{"success":false,"error":"Missing required fields"}
400
```

### 8. Notification pipeline tests — PASS
```
$ pnpm test --run tests/send-notifications.test.ts

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  146ms
```
**Note:** Initial run failed (2/2) because QA curl data for `qa-test` device shared the same barcode as the test fixture's target lot (`L6029479302`). After cleaning `qa-test` rows from `push_subscriptions` and `device_scans`, tests passed. This is expected — tests use the live DB without full isolation.

### 9. Recall events tests — PASS
```
$ pnpm test --run tests/recall-events.test.ts

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  83ms
```

### 10. Full test suite — PASS
```
$ pnpm test --run

 Test Files  12 passed (12)
      Tests  142 passed (142)
   Duration  203ms
```

---

## Summary

| Category | Result |
|----------|--------|
| API Scenarios (1-7) | 7/7 PASS |
| Unit/Integration Tests (8-10) | 3/3 PASS (146/142 tests) |
| **Total Scenarios** | **10/10 PASS** |

---

## Known Issue

Tests share the live SQLite DB. QA curl data with barcode `4012345678901` (which maps to the same product as test lot `L6029479302`) caused `sendRecallNotifications` to find an extra subscriber. Cleanup before test runs resolves this. Not a code bug — a test environment concern.

---

## Verdict

```
Scenarios [10/10 pass] | Integration [142/142] | VERDICT: APPROVE
```
