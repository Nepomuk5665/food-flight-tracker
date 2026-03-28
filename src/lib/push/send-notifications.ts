import webpush from "web-push";
import {
  deletePushSubscription,
  getBatchByLotCode,
  getDeviceIdsByBarcode,
  getProductById,
  getSubscriptionsForDevices,
} from "@/lib/db/queries";
import { onRecallCreated, type RecallEvent } from "@/lib/recall-events";
import { initWebPush } from "@/lib/push/config";

type RecalledProduct = {
  barcode: string;
  productName: string;
};

function getRecalledProducts(event: RecallEvent): RecalledProduct[] {
  const productsByBarcode = new Map<string, string>();

  for (const lotCode of event.lotCodes) {
    const batch = getBatchByLotCode(lotCode);
    if (!batch) continue;

    const product = getProductById(batch.productId);
    if (!product) continue;

    productsByBarcode.set(product.barcode, product.name);
  }

  return [...productsByBarcode.entries()].map(([barcode, productName]) => ({
    barcode,
    productName,
  }));
}

export async function sendRecallNotifications(event: RecallEvent): Promise<void> {
  const recalledProducts = getRecalledProducts(event);

  for (const recalledProduct of recalledProducts) {
    const deviceIds = getDeviceIdsByBarcode(recalledProduct.barcode);
    if (deviceIds.length === 0) continue;

    const subscriptions = getSubscriptionsForDevices(deviceIds);

    // Deduplicate: one notification per device per product
    const seenDeviceIds = new Set<string>();
    for (const subscription of subscriptions) {
      if (seenDeviceIds.has(subscription.deviceId)) continue;
      seenDeviceIds.add(subscription.deviceId);

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify({
            title: `Recall Alert: ${recalledProduct.productName}`,
            body: event.reason,
            url: `/product/${recalledProduct.barcode}`,
          }),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 410) {
          deletePushSubscription(subscription.endpoint);
        }
      }
    }
  }
}

initWebPush();
onRecallCreated(sendRecallNotifications);
