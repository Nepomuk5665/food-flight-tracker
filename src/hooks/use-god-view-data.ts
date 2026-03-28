"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GodViewData } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;

interface GodViewState {
  data: GodViewData | null;
  loading: boolean;
  error: string | null;
}

export function useGodViewData() {
  const [state, setState] = useState<GodViewState>({
    data: null,
    loading: true,
    error: null,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (attempt = 0) => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Unknown error");

      if (mountedRef.current) {
        setState({ data: json.data, loading: false, error: null });
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        // Retry up to 2 times with backoff before surfacing error
        if (attempt < 2) {
          setTimeout(() => fetchData(attempt + 1), 1000 * (attempt + 1));
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load data";
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    timerRef.current = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  return state;
}
