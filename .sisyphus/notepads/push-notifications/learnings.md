
## Task 5: Push Subscribe Endpoint

- `upsertPushSubscription` returns `{ created: boolean }` — use for 201 vs 200 status
- `deletePushSubscription(endpoint)` is void, no return value needed
- Route pattern: simpler than reports route (no rate limiting, no auth needed)
- `new NextResponse(null, { status: 204 })` for empty body DELETE responses
- Dev server must be started manually (`pnpm dev &`) before curl tests
- Pre-existing LSP error in Co2Section.tsx (missing `@/lib/scan-history`) — unrelated to this task
- Added src/lib/push/config.ts with one-time VAPID initialization guard and missing-key warning fallback.
- Implemented src/lib/push/send-notifications.ts: lotCode -> batch -> product resolution, barcode dedupe, per-subscription send, and 410 stale-endpoint cleanup.
- Registered push sender via side-effect initWebPush(); onRecallCreated(sendRecallNotifications); for fire-and-forget recall event handling.
- Added tests/send-notifications.test.ts using real SQLite seeding patterns: verifies send payload to affected device and 410 cleanup deletes push_subscriptions row.

## Task 6: Notification Prompt UI
- Created `src/components/notification-prompt.tsx` to handle the custom push notification permission prompt.
- The prompt is a floating overlay positioned above the bottom nav (`bottom-[82px]`).
- It checks for `Notification` and `serviceWorker` support before showing.
- It uses `localStorage` to remember if the user has already been prompted (`fft:push-prompted`).
- On grant, it registers the service worker, subscribes to push notifications using the VAPID public key, and POSTs the subscription to `/api/push/subscribe`.
- Added the `<NotificationPrompt />` component to `src/app/(consumer)/layout.tsx` inside the `MobileGate` wrapper.
- Fixed a TypeScript error with `applicationServerKey` by casting the `Uint8Array` to `any` (or `BufferSource`).
