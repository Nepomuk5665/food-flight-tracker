"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { LineageTree, LineageBatchJourney, JourneyStage } from "@/lib/types";

type LineageResponse = {
  success: boolean;
  data?: {
    journey: JourneyStage[];
    lineageTree?: {
      parents: LineageBatchJourney[];
      children: LineageBatchJourney[];
    };
  };
};

type LineageState =
  | { status: "idle"; tree: null }
  | { status: "loading"; tree: null }
  | { status: "ready"; tree: LineageTree }
  | { status: "empty"; tree: null };

export function useLineageData(
  lotCode: string | null | undefined,
  mainStages: JourneyStage[],
) {
  const [state, setState] = useState<LineageState>({ status: "idle", tree: null });
  const fetchedRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchLineage = useCallback(async (lot: string, stages: JourneyStage[]) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch(`/api/batch/${encodeURIComponent(lot)}?include=lineage-stages`);
      const result = (await res.json()) as LineageResponse;
      const lt = result.data?.lineageTree;

      if (!lt || (lt.parents.length === 0 && lt.children.length === 0)) {
        setState({ status: "empty", tree: null });
        return;
      }

      setState({
        status: "ready",
        tree: {
          main: { lotCode: lot, pathRole: "main", relationship: null, ratio: null, stages },
          parents: lt.parents,
          children: lt.children,
        },
      });
    } catch {
      setState({ status: "empty", tree: null });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!lotCode || mainStages.length === 0) return;
    if (fetchedRef.current === lotCode) return;
    fetchedRef.current = lotCode;
    fetchLineage(lotCode, mainStages);
  }, [lotCode, mainStages, fetchLineage]);

  return state;
}
