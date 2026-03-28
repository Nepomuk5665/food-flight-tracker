import webpush from "web-push";

let initialized = false;

export function initWebPush() {
  if (initialized) return;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.warn("[push] VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}
