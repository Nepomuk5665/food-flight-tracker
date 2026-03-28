"use client";

import { useEffect } from "react";
import { addToScanHistory } from "@/lib/scan-history";
import { getDeviceId } from "@/lib/device-id";

type Props = {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  nutriScore: string | null;
  source: string;
};

export default function SaveToHistory(props: Props) {
  useEffect(() => {
    addToScanHistory({ ...props, aiSummary: null });

    // Fire-and-forget server-side scan recording for push notifications
    try {
      fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), barcode: props.barcode }),
      }).catch(() => {
        /* silent fail */
      });
    } catch {
      // silent fail — scan recording is best-effort
    }
  }, [props]);

  return null;
}
