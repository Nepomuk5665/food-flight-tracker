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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#9eca45]"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-[#dc2626]" />
        <h2 className="text-xl font-bold text-[#060606]">Error Loading Batch</h2>
        <p className="mt-2 text-[#777777]">{error}</p>
      </div>
    );
  }

  const { batch, product, journey, lineage } = data;

  // Status badge logic
  let statusColor = "bg-[#3fa435]"; // active = green
  if (batch.status === "under_review") statusColor = "bg-[#ea580c]"; // orange
  if (batch.status === "recalled") statusColor = "bg-[#dc2626]"; // red

  return (
    <div className="mx-auto max-w-[1170px] space-y-8 px-4 py-8 font-sans">
      {/* Header Section */}
      <header className="flex flex-col justify-between gap-6 border border-[#e2e8f0] bg-white p-6 md:flex-row md:items-center rounded-none">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold uppercase tracking-wide text-[#060606]">
              {product?.name || "Unknown Product"}
            </h1>
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-none ${statusColor}`}>
              {batch.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-lg text-[#777777]">Lot Code: <span className="font-semibold text-[#003a5d]">{batch.lotCode}</span></p>
          
          <div className="mt-4 flex gap-6 text-sm text-[#424242]">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#9eca45]" />
              <span>Created: {new Date(batch.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#9eca45]" />
              <span>Updated: {new Date(batch.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Risk Score Gauge */}
        <div className="flex flex-col items-center justify-center border-l border-[#e2e8f0] pl-6 md:pl-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#777777]">Risk Score</p>
          <RiskGauge score={batch.riskScore} />
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-[#e2e8f0]">
        <div className="flex gap-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "border-[#9eca45] text-[#003a5d]"
                  : "border-transparent text-[#777777] hover:text-[#060606]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px] border border-[#e2e8f0] bg-white rounded-none">
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
                <div className="bg-[#f7f9fa] p-6">
                  <h3 className="mb-4 text-lg font-bold uppercase text-[#003a5d]">Journey Timeline</h3>
                  <JourneyTimeline
                    stages={journey}
                    activeStageId={selectedStage?.stageId || null}
                    onStageClick={setSelectedStage}
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
              <div className="h-[600px] p-0">
                <AiInsights
                  lotCode={batch.lotCode}
                  autoPrompt="Analyze this batch. Assess risk, flag anomalies, recommend actions."
                  context={JSON.stringify(data)}
                  fullPage={true}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  let color = "#3fa435"; // green
  if (score > 25) color = "#f59e0b"; // yellow
  if (score > 50) color = "#ea580c"; // orange
  if (score > 75) color = "#dc2626"; // red

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} stroke="#e2e8f0" strokeWidth="6" fill="none" />
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
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#060606]">{score}</span>
      </div>
    </div>
  );
}

function TelemetryTab({ stages }: { stages: JourneyStage[] }) {
  const stagesWithTelemetry = stages.filter(
    (s) => s.telemetry && s.telemetry.avgTemperature !== undefined && s.telemetry.avgTemperature !== null
  );

  if (stagesWithTelemetry.length === 0) {
    return <div className="p-12 text-center text-[#777777]">No telemetry data available for this batch.</div>;
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
    <div className="space-y-6 p-6 bg-[#f7f9fa] min-h-[500px]">
      {stagesWithTelemetry.map((stage) => {
        const hasAnomaly = stage.anomalies.some(
          (a) => a.type.includes("temperature") || a.type.includes("cold_chain")
        );
        const color = hasAnomaly ? "#dc2626" : "#3fa435";

        const minTemp = stage.telemetry.minTemperature ?? 0;
        const maxTemp = stage.telemetry.maxTemperature ?? 0;
        const avgTemp = stage.telemetry.avgTemperature ?? 0;

        const leftPercent = Math.max(0, Math.min(100, ((minTemp - globalMin) / range) * 100));
        const widthPercent = Math.max(1, Math.min(100 - leftPercent, ((maxTemp - minTemp) / range) * 100));
        const avgPercent = Math.max(0, Math.min(100, ((avgTemp - globalMin) / range) * 100));

        return (
          <div key={stage.stageId} className="border border-[#e2e8f0] bg-white p-5 rounded-none shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold uppercase text-[#003a5d]">{stage.name}</h3>
                {hasAnomaly && (
                  <span className="bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600 rounded-none">
                    Anomaly Detected
                  </span>
                )}
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-[#777777]">
                  Avg Temp: <strong className="text-[#060606]">{avgTemp}°C</strong>
                </span>
                <span className="text-[#777777]">
                  Humidity: <strong className="text-[#060606]">{stage.telemetry.avgHumidity ?? "--"}%</strong>
                </span>
              </div>
            </div>

            <div className="relative mt-2 h-10 border border-[#e2e8f0] bg-[#f7f9fa]">
              {/* Threshold line (mocked at 8°C) */}
              <div
                className="absolute bottom-0 top-0 z-10 border-l-2 border-dashed border-[#dc2626]"
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
                style={{ left: `calc(${avgPercent}% - 3px)`, backgroundColor: "#060606" }}
                title={`Avg: ${avgTemp}°C`}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-[#777777]">
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
    <div className="flex min-h-[500px] flex-col items-center justify-center gap-8 bg-[#f7f9fa] p-8 md:flex-row">
      {/* Parents */}
      <div className="flex flex-col gap-4">
        {lineage.parents.length === 0 ? (
          <div className="text-sm italic text-[#777777]">No parent batches</div>
        ) : (
          lineage.parents.map((p) => (
            <Link key={p.lotCode} href={`/batch/${p.lotCode}`} className="block">
              <div className="w-48 cursor-pointer border border-[#e2e8f0] bg-white p-4 text-center transition-colors hover:border-[#9eca45] rounded-none">
                <div className="mb-1 text-xs font-bold uppercase text-[#777777]">Parent</div>
                <div className="text-sm font-bold text-[#003a5d]">{p.lotCode}</div>
                <div className="mt-2 bg-[#f7f9fa] py-1 text-xs text-[#424242]">
                  {p.relationship} ({p.ratio}%)
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Arrow */}
      <div className="hidden flex-col items-center text-[#dddddd] md:flex">
        <ArrowRight className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center text-[#dddddd] md:hidden">
        <ArrowDown className="h-8 w-8" />
      </div>

      {/* Current */}
      <div className="w-56 border-2 border-[#003a5d] bg-white p-6 text-center shadow-sm rounded-none">
        <div className="mb-1 text-xs font-bold uppercase text-[#9eca45]">Current Batch</div>
        <div className="text-lg font-bold text-[#060606]">{currentLotCode}</div>
      </div>

      {/* Arrow */}
      <div className="hidden flex-col items-center text-[#dddddd] md:flex">
        <ArrowRight className="h-8 w-8" />
      </div>
      <div className="flex flex-col items-center text-[#dddddd] md:hidden">
        <ArrowDown className="h-8 w-8" />
      </div>

      {/* Children */}
      <div className="flex flex-col gap-4">
        {lineage.children.length === 0 ? (
          <div className="text-sm italic text-[#777777]">No child batches</div>
        ) : (
          lineage.children.map((c) => (
            <Link key={c.lotCode} href={`/batch/${c.lotCode}`} className="block">
              <div className="w-48 cursor-pointer border border-[#e2e8f0] bg-white p-4 text-center transition-colors hover:border-[#9eca45] rounded-none">
                <div className="mb-1 text-xs font-bold uppercase text-[#777777]">Child</div>
                <div className="text-sm font-bold text-[#003a5d]">{c.lotCode}</div>
                <div className="mt-2 bg-[#f7f9fa] py-1 text-xs text-[#424242]">
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
