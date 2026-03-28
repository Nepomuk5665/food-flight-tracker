import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions, deviceScans, products, batches } from "@/lib/db/schema";
import { sendRecallNotifications } from "@/lib/push/send-notifications";

const TEST_LOT = "L6029479302";
const TEST_BARCODE = "4012345678901";
const TEST_PRODUCT_ID = "test-prod-notif";
const TEST_REASON = "contamination";

describe("sendRecallNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

    db.insert(products)
      .values({
        id: TEST_PRODUCT_ID,
        barcode: TEST_BARCODE,
        name: "Test Chocolate",
        brand: "TestBrand",
        category: "snacks",
      })
      .onConflictDoNothing()
      .run();

    db.insert(batches)
      .values({
        id: "test-batch-notif",
        lotCode: TEST_LOT,
        productId: TEST_PRODUCT_ID,
        status: "active",
        riskScore: 42,
      })
      .onConflictDoNothing()
      .run();
  });

  afterEach(() => {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, "dev-1")).run();
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, "dev-stale")).run();

    db.delete(deviceScans)
      .where(and(eq(deviceScans.deviceId, "dev-1"), eq(deviceScans.barcode, TEST_BARCODE)))
      .run();
    db.delete(deviceScans)
      .where(and(eq(deviceScans.deviceId, "dev-stale"), eq(deviceScans.barcode, TEST_BARCODE)))
      .run();

    db.delete(batches).where(eq(batches.id, "test-batch-notif")).run();
    db.delete(products).where(eq(products.id, TEST_PRODUCT_ID)).run();
  });

  it("sends notification to an affected device", async () => {
    const barcode = TEST_BARCODE;
    const endpoint = "https://example.com/push/dev-1";

    db.insert(pushSubscriptions)
      .values({
        deviceId: "dev-1",
        endpoint,
        auth: "auth-key",
        p256dh: "p256dh-key",
      })
      .run();

    db.insert(deviceScans)
      .values({
        deviceId: "dev-1",
        barcode,
      })
      .run();

    await sendRecallNotifications({
      recallId: "r1",
      reason: TEST_REASON,
      severity: "critical",
      lotCodes: [TEST_LOT],
    });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);

    const [subscriptionArg, payloadArg] = vi.mocked(webpush.sendNotification).mock.calls[0];
    expect(subscriptionArg).toMatchObject({ endpoint });

    const payload = JSON.parse(payloadArg as string) as { body?: string };
    expect(payload.body).toContain(TEST_REASON);
  });

  it("deletes stale subscription on 410 Gone", async () => {
    const barcode = TEST_BARCODE;
    const staleEndpoint = "https://example.com/push/dev-stale";

    db.insert(pushSubscriptions)
      .values({
        deviceId: "dev-stale",
        endpoint: staleEndpoint,
        auth: "auth-key",
        p256dh: "p256dh-key",
      })
      .run();

    db.insert(deviceScans)
      .values({
        deviceId: "dev-stale",
        barcode,
      })
      .run();

    vi.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410, body: "Gone" } as never);

    await sendRecallNotifications({
      recallId: "r1",
      reason: TEST_REASON,
      severity: "critical",
      lotCodes: [TEST_LOT],
    });

    const remaining = db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.deviceId, "dev-stale"))
      .all();

    expect(remaining).toHaveLength(0);
  });
});
