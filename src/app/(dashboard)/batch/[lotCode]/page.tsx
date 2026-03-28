"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";

import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import AiInsights from "@/components/ai-insights";
import type { JourneyStage } from "@/lib/types";

const JourneyMap = dynamic(
  () => import("@/components/journey/JourneyMap").then((mod) => mod.JourneyMap),
  { ssr: false }
);

const TABS = ["Journey Map", "Telemetry", "Lineage", "AI Analysis"] as const;
type Tab = typeof TABS[number];

type BatchDetailPageProps = {
  params: Promise<{ lotCode: string }>;
};

type RecallInfo = {
  id: string;
  reason: string;
  severity: string;
  createdAt: string;
};

type BatchData = {
  batch: {
    id: string;
    lotCode: string;
    status: string;
    riskScore: number;
    createdAt: string;
    updatedAt: string;
  };
  product: {
    name: string;
  };
  journey: JourneyStage[];
  lineage: {
    parents: { lotCode: string; relationship: string; ratio: number }[];
    children: { lotCode: string; relationship: string; ratio: number }[];
  };
  recall?: RecallInfo;
};

export default function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { lotCode } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("Journey Map");
  const [data, setData] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/batch/${lotCode}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load batch data");
        }
      } catch {
        setError("An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [lotCode]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin border-2 border-white/30 border-t-white" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
            Loading batch...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="border border-[#ff4d4f]/20 bg-[#ff4d4f]/5 px-6 py-4 backdrop-blur-2xl">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#ff4d4f]" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#ff4d4f]">Error Loading Batch</h2>
          <p className="mt-1 text-xs text-white/40">{error}</p>
        </div>
      </div>
    );
  }

  const { batch, product, journey, lineage, recall } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-[1170px] space-y-6 p-6"
    >
      {/* Recall Banner */}
      {recall && (
        <div className="flex items-start gap-4 border border-[#ff4d4f]/30 bg-[#ff4d4f]/[0.06] backdrop-blur-2xl p-5 shadow-[0_0_24px_-8px_rgba(255,77,79,0.2)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4d4f]" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-wider text-[#ff4d4f]">Recalled</span>
              <span className="border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                {recall.severity}
              </span>
            </div>
            <p className="text-sm text-white/70">{recall.reason}</p>
            <p className="text-[10px] text-white/30">
              Issued {new Date(recall.createdAt).toLocaleString()} &middot; ID {recall.id.substring(0, 8)}
            </p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <header className="flex flex-col justify-between gap-6 border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-6 md:flex-row md:items-center shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-white">
              {product?.name || "Unknown Product"}
            </h1>
            <StatusBadge status={batch.status} />
          </div>
          <p className="text-sm text-white/40">
            Lot Code: <span className="font-bold text-white/80 font-mono">{batch.lotCode}</span>
          </p>

          <div className="mt-4 flex gap-6 text-xs text-white/30">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-white/20" />
              <span>Created: {new Date(batch.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-white/20" />
              <span>Updated: {new Date(batch.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Risk Score Gauge */}
        <div className="flex flex-col items-center justify-center border-l border-white/[0.06] pl-6 md:pl-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/40">Risk Score</p>
          <RiskGauge score={batch.riskScore} />
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 pb-4 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "border-[#52c41a] text-white"
                  : "border-transparent text-white/40 hover:text-white/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px] border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "Journey Map" && (
              <div className="flex flex-col">
                <div className="h-[400px] w-full bg-[#0f1320]">
                  <JourneyMap
                    stages={journey}
                    selectedStage={selectedStage}
                    onStageSelect={setSelectedStage}
                  />
                </div>
                <div className="border-t border-white/[0.06] bg-white/[0.01] p-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/50">Journey Timeline</h3>
                  <JourneyTimeline
                    stages={journey}
                    activeStageId={selectedStage?.stageId || null}
                    onStageClick={setSelectedStage}
                    variant="dark"
                  />
                </div>
              </div>
            )}

            {activeTab === "Telemetry" && (
              <TelemetryTab stages={journey} />
            )}

            {activeTab === "Lineage" && (
              <LineageTab lineage={lineage} currentLotCode={batch.lotCode} />
            )}

            {activeTab === "AI Analysis" && (
              <div className="h-[600px]">
                <AiInsights
                  lotCode={batch.lotCode}
                  autoPrompt="Analyze this batch. Assess risk, flag anomalies, recommend actions."
                  context={JSON.stringify(data)}
                  variant="dashboard"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-white/20 text-white/80 bg-white/[0.06]",
    under_review: "border-[#faad14]/30 text-[#faad14] bg-[#faad14]/[0.06]",
    recalled: "border-[#ff4d4f]/30 text-[#ff4d4f] bg-[#ff4d4f]/[0.06]",
    consumed: "border-white/10 text-white/40 bg-white/[0.03]",
  };

  const style = styles[status.toLowerCase()] ?? "border-white/10 text-white/50 bg-white/[0.03]";

  return (
    <span className={`border text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function RiskGauge({ score }: { score: number }) {
  let color = "#52c41a";
  if (score > 25) color = "#faad14";
  if (score > 50) color = "#fa8c16";
  if (score > 75) color = "#ff4d4f";

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

function TelemetryTab({ stages }: { stages: JourneyStage[] }) {
  const stagesWithTelemetry = stages.filter(
    (s) => s.telemetry && s.telemetry.avgTemperature !== undefined && s.telemetry.avgTemperature !== null
  );

  if (stagesWithTelemetry.length === 0) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <p className="text-sm text-white/20">No telemetry data available for this batch.</p>
      </div>
    );
  }

  let globalMin = Infinity;
  let globalMax = -Infinity;
  stagesWithTelemetry.forEach((s) => {
    if (s.telemetry.minTemperature !== undefined && s.telemetry.minTemperature !== null && s.telemetry.minTemperature < globalMin) {
      globalMin = s.telemetry.minTemperature;
    }
    if (s.telemetry.maxTemperature !== undefined && s.telemetry.maxTemperature !== null && s.telemetry.maxTemperature > globalMax) {
      globalMax = s.telemetry.maxTemperature;
    }
  });

  if (globalMin === Infinity) globalMin = 0;
  if (globalMax === -Infinity) globalMax = 30;

  globalMin = Math.floor(globalMin) - 5;
  globalMax = Math.ceil(globalMax) + 5;
  const range = globalMax - globalMin;

  return (
    <div className="space-y-4 p-6 min-h-[500px]">
      {stagesWithTelemetry.map((stage) => {
        const hasAnomaly = stage.anomalies.some(
          (a) => a.type.includes("temperature") || a.type.includes("cold_chain")
        );
        const color = hasAnomaly ? "#ff4d4f" : "#52c41a";

        const minTemp = stage.telemetry.minTemperature ?? 0;
        const maxTemp = stage.telemetry.maxTemperature ?? 0;
        const avgTemp = stage.telemetry.avgTemperature ?? 0;

        const leftPercent = Math.max(0, Math.min(100, ((minTemp - globalMin) / range) * 100));
        const widthPercent = Math.max(1, Math.min(100 - leftPercent, ((maxTemp - minTemp) / range) * 100));
        const avgPercent = Math.max(0, Math.min(100, ((avgTemp - globalMin) / range) * 100));

        return (
          <div
            key={stage.stageId}
            className={`border bg-white/[0.02] p-5 ${
              hasAnomaly
                ? "border-[#ff4d4f]/20 border-l-2 border-l-[#ff4d4f] shadow-[0_0_20px_-8px_rgba(255,77,79,0.15)]"
                : "border-white/[0.08]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">{stage.name}</h3>
                {hasAnomaly && (
                  <span className="border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff4d4f]">
                    Anomaly
                  </span>
                )}
              </div>
              <div className="flex gap-6 text-xs">
                <span className="text-white/30">
                  Avg Temp: <strong className="text-white/70">{avgTemp}°C</strong>
                </span>
                <span className="text-white/30">
                  Humidity: <strong className="text-white/70">{stage.telemetry.avgHumidity ?? "--"}%</strong>
                </span>
              </div>
            </div>

            <div className="relative mt-2 h-10 border border-white/[0.06] bg-white/[0.02]">
              {/* Threshold line (8°C) */}
              <div
                className="absolute bottom-0 top-0 z-10 border-l-2 border-dashed border-[#ff4d4f]/50"
                style={{ left: `${Math.max(0, Math.min(100, ((8 - globalMin) / range) * 100))}%` }}
                title="Threshold (8°C)"
              />

              {/* Range bar */}
              <div
                className="absolute bottom-2 top-2 opacity-30"
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, backgroundColor: color }}
              />

              {/* Min/Max markers */}
              <div
                className="absolute bottom-1.5 top-1.5 w-1"
                style={{ left: `${leftPercent}%`, backgroundColor: color }}
                title={`Min: ${minTemp}°C`}
              />
              <div
                className="absolute bottom-1.5 top-1.5 w-1"
                style={{ left: `${leftPercent + widthPercent}%`, backgroundColor: color }}
                title={`Max: ${maxTemp}°C`}
              />

              {/* Avg marker */}
              <div
                className="absolute bottom-0.5 top-0.5 z-20 w-1.5"
                style={{ left: `calc(${avgPercent}% - 3px)`, backgroundColor: "white" }}
                title={`Avg: ${avgTemp}°C`}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-white/20">
              <span>{globalMin}°C</span>
              <span>{globalMax}°C</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineageTab({ lineage, currentLotCode }: { lineage: BatchData["lineage"]; currentLotCode: string }) {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center gap-8 p-8 md:flex-row">
      {/* Parents */}
      <div className="flex flex-col gap-4">
        {lineage.parents.length === 0 ? (
          <div className="text-sm text-white/20">No parent batches</div>
        ) : (
          lineage.parents.map((p) => (
            <Link key={p.lotCode} href={`/batch/${p.lotCode}`} className="block">
              <div className="w-48 cursor-pointer border border-white/[0.08] bg-white/[0.02] p-4 text-center transition-all hover:border-white/20 hover:bg-white/[0.04] backdrop-blur-2xl">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/30">Parent</div>
                <div className="text-sm font-bold text-white/80 font-mono">{p.lotCode}</div>
                <div className="mt-2 border-t border-white/[0.06] pt-2 text-[10px] text-white/40">
                  {p.relationship} ({p.ratio}%)
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Arrow */}
      <div className="hidden flex-col items-center text-white/10 md:flex">
        <ArrowRight className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center text-white/10 md:hidden">
        <ArrowDown className="h-8 w-8" />
      </div>

      {/* Current */}
      <div className="w-56 border-2 border-[#52c41a]/30 bg-[#52c41a]/[0.04] p-6 text-center shadow-[0_0_20px_-8px_rgba(82,196,26,0.2)]">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#52c41a]">Current Batch</div>
        <div className="text-lg font-bold text-white font-mono">{currentLotCode}</div>
      </div>

      {/* Arrow */}
      <div className="hidden flex-col items-center text-white/10 md:flex">
        <ArrowRight className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center text-white/10 md:hidden">
        <ArrowDown className="h-8 w-8" />
      </div>

      {/* Children */}
      <div className="flex flex-col gap-4">
        {lineage.children.length === 0 ? (
          <div className="text-sm text-white/20">No child batches</div>
        ) : (
          lineage.children.map((c) => (
            <Link key={c.lotCode} href={`/batch/${c.lotCode}`} className="block">
              <div className="w-48 cursor-pointer border border-white/[0.08] bg-white/[0.02] p-4 text-center transition-all hover:border-white/20 hover:bg-white/[0.04] backdrop-blur-2xl">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/30">Child</div>
                <div className="text-sm font-bold text-white/80 font-mono">{c.lotCode}</div>
                <div className="mt-2 border-t border-white/[0.06] pt-2 text-[10px] text-white/40">
                  {c.relationship} ({c.ratio}%)
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
