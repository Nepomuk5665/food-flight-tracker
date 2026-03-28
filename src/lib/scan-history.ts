const STORAGE_KEY = "fft:scan-history";
const CHAT_KEY = "fft:ai-conversations";

const MAX_ENTRIES = 50;

export type AiMessage = { role: "user" | "assistant"; content: string };

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

export function clearScanHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHAT_KEY);
}

function getChatStore(): Record<string, AiMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AiMessage[]>) : {};
  } catch {
    return {};
  }
}

export function getConversation(key: string): AiMessage[] {
  return getChatStore()[key] ?? [];
}

export function saveConversation(key: string, messages: AiMessage[]) {
  if (typeof window === "undefined") return;
  const store = getChatStore();
  store[key] = messages;

  const entry = getScanHistory().find((e) => e.barcode === key);
  if (entry) {
    const firstAssistant = messages.find((m) => m.role === "assistant");
    if (firstAssistant) {
      entry.aiSummary = firstAssistant.content;
      const history = getScanHistory().map((e) => (e.barcode === key ? entry : e));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  }

  localStorage.setItem(CHAT_KEY, JSON.stringify(store));
}


