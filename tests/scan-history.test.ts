import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getScanHistory,
  addToScanHistory,
  clearScanHistory,
  getConversation,
  saveConversation,
  type ScanHistoryEntry,
  type AiMessage,
} from "@/lib/scan-history";

const STORAGE_KEY = "fft:scan-history";
const CHAT_KEY = "fft:ai-conversations";

let store: Record<string, string>;

beforeEach(() => {
  store = {};

  const mockStorage = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeEntry(barcode: string, overrides: Partial<Omit<ScanHistoryEntry, "scannedAt">> = {}): Omit<ScanHistoryEntry, "scannedAt"> {
  return {
    barcode,
    name: `Product ${barcode}`,
    brand: "TestBrand",
    imageUrl: null,
    nutriScore: "B",
    source: "internal",
    aiSummary: null,
    ...overrides,
  };
}

describe("getScanHistory", () => {
  it("returns empty array on server (no window)", () => {
    vi.unstubAllGlobals();
    expect(getScanHistory()).toEqual([]);
  });

  it("returns empty array when localStorage is empty", () => {
    expect(getScanHistory()).toEqual([]);
  });

  it("returns parsed entries from localStorage", () => {
    const entries: ScanHistoryEntry[] = [
      { ...makeEntry("123"), scannedAt: "2026-01-01T00:00:00Z" },
    ];
    store[STORAGE_KEY] = JSON.stringify(entries);
    const result = getScanHistory();
    expect(result).toHaveLength(1);
    expect(result[0].barcode).toBe("123");
  });

  it("returns empty array on parse error", () => {
    store[STORAGE_KEY] = "INVALID JSON{{{";
    expect(getScanHistory()).toEqual([]);
  });
});

describe("addToScanHistory", () => {
  it("does nothing on server (no window)", () => {
    vi.unstubAllGlobals();
    addToScanHistory(makeEntry("111"));
  });

  it("adds a new entry to the front of history", () => {
    addToScanHistory(makeEntry("111"));
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history).toHaveLength(1);
    expect(history[0].barcode).toBe("111");
    expect(history[0].scannedAt).toBeTruthy();
  });

  it("moves existing barcode to the front (dedup)", () => {
    addToScanHistory(makeEntry("111"));
    addToScanHistory(makeEntry("222"));
    addToScanHistory(makeEntry("111", { name: "Updated" }));
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history).toHaveLength(2);
    expect(history[0].barcode).toBe("111");
    expect(history[0].name).toBe("Updated");
    expect(history[1].barcode).toBe("222");
  });

  it("preserves existing aiSummary when new entry has null", () => {
    addToScanHistory(makeEntry("111", { aiSummary: "Previous summary" }));
    addToScanHistory(makeEntry("111", { aiSummary: null }));
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history[0].aiSummary).toBe("Previous summary");
  });

  it("overwrites aiSummary when new entry has a value", () => {
    addToScanHistory(makeEntry("111", { aiSummary: "Old" }));
    addToScanHistory(makeEntry("111", { aiSummary: "New" }));
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history[0].aiSummary).toBe("New");
  });

  it("caps history at 50 entries", () => {
    for (let i = 0; i < 55; i++) {
      addToScanHistory(makeEntry(String(i)));
    }
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history).toHaveLength(50);
  });
});

describe("clearScanHistory", () => {
  it("does nothing on server (no window)", () => {
    vi.unstubAllGlobals();
    clearScanHistory();
  });

  it("removes both scan history and chat keys", () => {
    store[STORAGE_KEY] = "[]";
    store[CHAT_KEY] = "{}";
    clearScanHistory();
    expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(localStorage.removeItem).toHaveBeenCalledWith(CHAT_KEY);
  });
});

describe("getConversation", () => {
  it("returns empty array on server (no window)", () => {
    vi.unstubAllGlobals();
    expect(getConversation("123")).toEqual([]);
  });

  it("returns empty array for unknown key", () => {
    expect(getConversation("unknown-barcode")).toEqual([]);
  });

  it("returns stored conversation for a barcode", () => {
    const messages: AiMessage[] = [
      { role: "user", content: "Is this safe?" },
      { role: "assistant", content: "Yes, it is safe." },
    ];
    store[CHAT_KEY] = JSON.stringify({ "123": messages });
    expect(getConversation("123")).toEqual(messages);
  });

  it("returns empty array on parse error", () => {
    store[CHAT_KEY] = "NOT_JSON";
    expect(getConversation("123")).toEqual([]);
  });
});

describe("saveConversation", () => {
  it("does nothing on server (no window)", () => {
    vi.unstubAllGlobals();
    saveConversation("123", [{ role: "user", content: "Hi" }]);
  });

  it("stores conversation under the given key", () => {
    const messages: AiMessage[] = [{ role: "user", content: "Hello" }];
    saveConversation("123", messages);
    const chatStore = JSON.parse(store[CHAT_KEY]) as Record<string, AiMessage[]>;
    expect(chatStore["123"]).toEqual(messages);
  });

  it("updates aiSummary on scan history when first assistant message exists", () => {
    addToScanHistory(makeEntry("123"));
    const messages: AiMessage[] = [
      { role: "user", content: "Tell me about this" },
      { role: "assistant", content: "This product is excellent." },
    ];
    saveConversation("123", messages);
    const history = JSON.parse(store[STORAGE_KEY]) as ScanHistoryEntry[];
    expect(history[0].aiSummary).toBe("This product is excellent.");
  });

  it("does not crash when barcode not in scan history", () => {
    const messages: AiMessage[] = [
      { role: "assistant", content: "Summary" },
    ];
    expect(() => saveConversation("unknown", messages)).not.toThrow();
  });

  it("preserves existing conversations for other barcodes", () => {
    store[CHAT_KEY] = JSON.stringify({ "111": [{ role: "user", content: "A" }] });
    saveConversation("222", [{ role: "user", content: "B" }]);
    const chatStore = JSON.parse(store[CHAT_KEY]) as Record<string, AiMessage[]>;
    expect(chatStore["111"]).toBeTruthy();
    expect(chatStore["222"]).toBeTruthy();
  });
});
