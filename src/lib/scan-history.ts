const STORAGE_KEY = "fft:scan-history";
const MAX_ENTRIES = 50;

export interface ScanHistoryEntry {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  nutriScore: string | null;
  source: string;
  scannedAt: string;
  aiSummary: string | null;
}

export function getScanHistory(): ScanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToScanHistory(entry: Omit<ScanHistoryEntry, "scannedAt">) {
  if (typeof window === "undefined") return;
  const existing = getScanHistory().find((e) => e.barcode === entry.barcode);
  const history = getScanHistory().filter((e) => e.barcode !== entry.barcode);
  history.unshift({
    ...entry,
    aiSummary: entry.aiSummary ?? existing?.aiSummary ?? null,
    scannedAt: new Date().toISOString(),
  });
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function updateAiSummary(barcode: string, aiSummary: string) {
  if (typeof window === "undefined") return;
  const history = getScanHistory();
  const entry = history.find((e) => e.barcode === barcode);
  if (entry) {
    entry.aiSummary = aiSummary;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

export function getAiSummary(barcode: string): string | null {
  if (typeof window === "undefined") return null;
  return getScanHistory().find((e) => e.barcode === barcode)?.aiSummary ?? null;
}

export function clearScanHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
