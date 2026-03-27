"use client";

import { useState, useCallback, useRef } from "react";
import type { JourneyStage } from "@/lib/types";

type BatchInfo = {
  lotCode: string;
  status: string;
  riskScore: number;
  productName: string;
};

type JourneyPayload = {
  generated: boolean;
  batch: BatchInfo;
  journey: JourneyStage[];
};

type JourneyResponse = {
  success: boolean;
  data?: JourneyPayload;
  error?: {
    message: string;
  };
};

type JourneyDataState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; payload: JourneyPayload }
  | { status: "error"; message: string };

export function useJourneyData(
  barcode: string,
  existingSupplyChain: JourneyStage[],
  activeLot: { lotCode: string; status: string; riskScore: number } | null,
  productName: string,
) {
  const [state, setState] = useState<JourneyDataState>(() => {
    if (existingSupplyChain.length > 0 && activeLot) {
      return {
        status: "ready",
        payload: {
          generated: false,
          batch: {
            lotCode: activeLot.lotCode,
            status: activeLot.status,
            riskScore: activeLot.riskScore,
            productName,
          },
          journey: existingSupplyChain,
        },
      };
    }
    return { status: "idle" };
  });

  const generatingRef = useRef(false);

  const generate = useCallback(async () => {
    if (generatingRef.current) return;
    if (state.status === "ready") return;

    generatingRef.current = true;
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/journey/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      const result = (await response.json()) as JourneyResponse;

      if (!response.ok || !result.data) {
        throw new Error(result.error?.message ?? "Unable to generate journey");
      }

      setState({ status: "ready", payload: result.data });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to generate journey",
      });
    } finally {
      generatingRef.current = false;
    }
  }, [barcode, state.status]);

  return {
    ...state,
    payload: state.status === "ready" ? state.payload : null,
    loading: state.status === "loading",
    error: state.status === "error" ? state.message : null,
    generate,
  };
}
