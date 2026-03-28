const STORAGE_KEY = "fft-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
