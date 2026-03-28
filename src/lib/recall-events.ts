export type RecallEvent = {
  recallId: string;
  reason: string;
  severity: string;
  lotCodes: string[];
};

type Listener = (event: RecallEvent) => void;

// Use globalThis to survive Next.js module reloads in dev mode
// and ensure the SSE route and POST route share the same listener set.
const KEY = "__recall_event_listeners__" as const;

function getListeners(): Set<Listener> {
  const g = globalThis as unknown as Record<string, Set<Listener>>;
  if (!g[KEY]) {
    g[KEY] = new Set<Listener>();
  }
  return g[KEY];
}

export function onRecallCreated(listener: Listener): () => void {
  const listeners = getListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRecallCreated(event: RecallEvent): void {
  const listeners = getListeners();
  for (const listener of listeners) {
    listener(event);
  }
}
