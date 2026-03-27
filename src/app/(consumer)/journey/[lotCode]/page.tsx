"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { generatedJourneyStorageKey } from "@/lib/journey/storage";
import type { JourneyStage } from "@/lib/types";
import AiInsights from "@/components/ai-insights";

type JourneyPayload = {
  generated: boolean;
  batch: {
    lotCode: string;
    status: string;
    riskScore: number;
    productName: string;
  };
  journey: JourneyStage[];
};

type JourneyResponse = {
  success: boolean;
  data?: JourneyPayload;
  error?: {
    message: string;
  };
};

export default function JourneyPage() {
  const params = useParams<{ lotCode: string }>();
  const lotCode = params.lotCode;
  const [payload, setPayload] = useState<JourneyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadJourney = async () => {
      setLoading(true);
      setError(null);

      const storedJourney = window.sessionStorage.getItem(generatedJourneyStorageKey(lotCode));
      if (storedJourney) {
        try {
          const parsed = JSON.parse(storedJourney) as JourneyPayload;
          if (!cancelled) {
            setPayload(parsed);
            setLoading(false);
          }
          return;
        } catch {
          window.sessionStorage.removeItem(generatedJourneyStorageKey(lotCode));
        }
      }

      try {
        const response = await fetch(`/api/batch/${encodeURIComponent(lotCode)}`);
        const result = (await response.json()) as JourneyResponse;

        if (!response.ok || !result.data) {
          throw new Error(result.error?.message ?? "Journey not found");
        }

        if (!cancelled) {
          setPayload(result.data);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Journey not found");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadJourney();

    return () => {
      cancelled = true;
    };
  }, [lotCode]);

  if (loading) {
    return (
      <section className="space-y-4 font-sans">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Batch Journey</h1>
        <div className="border border-[#dddddd] bg-white p-4 rounded-none">
          <p className="text-sm text-[#424242]">Loading journey data...</p>
        </div>
      </section>
    );
  }

  if (error || !payload) {
    return (
      <section className="space-y-4 font-sans">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Batch Journey</h1>
        <div className="border border-[#dddddd] bg-white p-4 rounded-none">
          <p className="text-sm text-[#8c1d18]">{error ?? "Journey not found"}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 font-sans">
      <header className="grid gap-4 border border-[#dddddd] bg-white p-4 rounded-none lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Batch Journey</h1>
          <p className="mt-2 text-sm text-[#424242]">{payload.batch.productName}</p>
          <p className="text-sm text-[#777777]">Lot code: {payload.batch.lotCode}</p>
        </div>
        <div className="border border-[#dddddd] bg-[#f7f9fa] px-5 py-4 text-center rounded-none">
          <p className="text-xs font-bold uppercase text-[#003a5d]">Journey Status</p>
          <p className="mt-1 text-sm uppercase text-[#424242]">{payload.batch.status}</p>
          <p className="mt-1 text-xs uppercase text-[#777777]">Risk score {payload.batch.riskScore}</p>
        </div>
      </header>

      <div className="border border-[#dddddd] bg-[#111111] p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-white">Journey Map</h2>
        <div className="mt-3 min-h-[220px] border border-[#333333] bg-[#1a1a1a] p-4 rounded-none">
          <div className="space-y-3 text-sm text-[#bbbbbb]">
            {payload.journey.map((stage) => (
              <div key={stage.stageId} className="flex items-center justify-between gap-3 border-b border-[#2a2a2a] pb-2 last:border-b-0 last:pb-0">
                <div>
                  <p className="text-xs font-bold uppercase text-white">{stage.type}</p>
                  <p>{stage.name}</p>
                </div>
                <p className="text-right text-xs text-[#9eca45]">{stage.location.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-[#dddddd] bg-white p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Timeline</h2>
        <ul className="mt-3 space-y-3 text-sm text-[#424242]">
          {payload.journey.map((stage) => (
            <li key={stage.stageId} className="border-l-2 border-[#9eca45] pl-3">
              <p className="text-xs font-bold uppercase text-[#003a5d]">{stage.type}</p>
              <p className="font-semibold">{stage.name}</p>
              <p className="text-[#777777]">{stage.location.name}</p>
              {stage.anomalies.length > 0 ? (
                <p className="mt-1 text-xs font-semibold uppercase text-[#8c1d18]">
                  {stage.anomalies.length} anomaly{stage.anomalies.length === 1 ? "" : "ies"} detected
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <AiInsights
        lotCode={lotCode}
        autoPrompt="Analyze this supply chain journey. Summarize the route, flag any anomalies or risks, and give an overall safety assessment."
        suggestions={[
          "Is there a cold chain issue?",
          "How long was the transport?",
          "Should I be concerned?",
          "What does the risk score mean?",
        ]}
      />
    </section>
  );
}
