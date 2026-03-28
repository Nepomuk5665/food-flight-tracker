"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { getDeviceId } from "@/lib/device-id";

const PROMPT_KEY = "fft:push-prompted";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if: already prompted, Notification API unsupported, SW unsupported
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;
    
    const prompted = localStorage.getItem(PROMPT_KEY);
    if (prompted) return;
    
    // Show after a short delay so the page loads first
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setShow(false);
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        localStorage.setItem(PROMPT_KEY, "granted");
        
        // Register service worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        
        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
        
        const { endpoint, keys } = subscription.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        
        // POST subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: getDeviceId(),
            endpoint,
            keys,
          }),
        });
      } else {
        localStorage.setItem(PROMPT_KEY, "denied");
      }
    } catch {
      // Silent fail — push is best-effort
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(PROMPT_KEY, "dismissed");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[82px] left-0 right-0 z-[70] px-4 pb-2">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A34A]/10">
            <Bell className="h-4 w-4 text-[#16A34A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Get recall alerts</p>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              Get alerted if products you scan are recalled.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 text-muted hover:text-primary transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleEnable}
            className="flex-1 rounded-xl bg-[#16A34A] py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#15803d]"
          >
            Enable Alerts
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:text-primary"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}