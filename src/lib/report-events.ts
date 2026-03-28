export type ReportEvent = {
  id: string;
  lotCode: string;
  category: string;
};

type Listener = (event: ReportEvent) => void;

// Use globalThis to survive Next.js module reloads in dev mode
// and ensure the SSE route and POST route share the same listener set.
const KEY = "__report_event_listeners__" as const;

function getListeners(): Set<Listener> {
  const g = globalThis as unknown as Record<string, Set<Listener>>;
  if (!g[KEY]) {
    g[KEY] = new Set<Listener>();
  }
  return g[KEY];
}

export function onReportCreated(listener: Listener): () => void {
  const listeners = getListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitReportCreated(event: ReportEvent): void {
  const listeners = getListeners();
  for (const listener of listeners) {
    listener(event);
  }
}
