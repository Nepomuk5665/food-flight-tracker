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
import { getBatchByLotCode, getProductById } from "@/lib/db/queries";
import { pushSubscriptions, deviceScans } from "@/lib/db/schema";
import { sendRecallNotifications } from "@/lib/push/send-notifications";

const TEST_LOT = "L6029479302";
const TEST_REASON = "contamination";

function getTargetBarcode(): string {
  const batch = getBatchByLotCode(TEST_LOT);
  if (!batch) throw new Error(`Missing seeded batch for lot ${TEST_LOT}`);

  const product = getProductById(batch.productId);
  if (!product) throw new Error(`Missing product for lot ${TEST_LOT}`);

  return product.barcode;
}

describe("sendRecallNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
  });

  afterEach(() => {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, "dev-1")).run();
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, "dev-stale")).run();

    db.delete(deviceScans)
      .where(and(eq(deviceScans.deviceId, "dev-1"), eq(deviceScans.barcode, getTargetBarcode())))
      .run();
    db.delete(deviceScans)
      .where(and(eq(deviceScans.deviceId, "dev-stale"), eq(deviceScans.barcode, getTargetBarcode())))
      .run();
  });

  it("sends notification to an affected device", async () => {
    const barcode = getTargetBarcode();
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
    const barcode = getTargetBarcode();
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
