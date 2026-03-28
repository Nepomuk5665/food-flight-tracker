"use client";

import type { StageType } from "@/lib/types";

export interface TooltipData {
  x: number;
  y: number;
  type: "batch" | "route" | "stage";
  properties: Record<string, unknown>;
}

const STAGE_LABELS: Record<StageType, string> = {
  harvest: "Harvest",
  collection: "Collection",
  processing: "Processing",
  packaging: "Packaging",
  storage: "Storage",
  transport: "Transport",
  retail: "Retail",
};

const RISK_BADGE: Record<string, { label: string; color: string }> = {
  safe: { label: "Safe", color: "#3f4550" },
  warning: { label: "Warning", color: "#f5a623" },
  critical: { label: "Critical", color: "#e74c3c" },
};

function RiskBadge({ level }: { level: string }) {
  const badge = RISK_BADGE[level] ?? RISK_BADGE.safe;
  return (
    <span
      className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: badge.color, color: "#fff" }}
    >
      {badge.label}
    </span>
  );
}

function BatchTooltip({ properties }: { properties: Record<string, unknown> }) {
  const name = String(properties.productName ?? "Unknown");
  const lotCode = String(properties.lotCode ?? "");
  const riskLevel = String(properties.riskLevel ?? "safe");
  const riskScore = Number(properties.riskScore ?? 0);
  const anomalyCount = Number(properties.anomalyCount ?? 0);
  const status = String(properties.status ?? "active");

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-bold text-white/90 truncate max-w-[160px]">{name}</span>
        <RiskBadge level={riskLevel} />
      </div>
      <div className="space-y-0.5 text-[10px] text-white/50">
        <div>
          <span className="text-white/30">Lot </span>
          <span className="font-mono text-white/60">{lotCode}</span>
        </div>
        <div className="flex gap-3">
          <span>
            Risk <span className="text-white/70">{riskScore}</span>
          </span>
          {anomalyCount > 0 && (
            <span>
              Anomalies{" "}
              <span className={anomalyCount > 2 ? "text-[#e74c3c]" : "text-white/70"}>
                {anomalyCount}
              </span>
            </span>
          )}
          <span className="capitalize text-white/40">{status.replace("_", " ")}</span>
        </div>
      </div>
    </>
  );
}

function RouteTooltip({ properties }: { properties: Record<string, unknown> }) {
  const lotCode = String(properties.lotCode ?? "");
  const severity = Number(properties.segmentSeverity ?? 0);
  const severityLabel = severity >= 2 ? "Critical" : severity >= 1 ? "Warning" : "Normal";
  const severityColor = severity >= 2 ? "#e74c3c" : severity >= 1 ? "#f5a623" : "#3f4550";

  return (
    <>
      <div className="mb-1 text-xs font-bold text-white/90">Supply Chain Route</div>
      <div className="space-y-0.5 text-[10px] text-white/50">
        <div>
          <span className="text-white/30">Lot </span>
          <span className="font-mono text-white/60">{lotCode}</span>
        </div>
        <div>
          <span className="text-white/30">Segment </span>
          <span className="font-bold" style={{ color: severityColor }}>
            {severityLabel}
          </span>
        </div>
      </div>
    </>
  );
}

function StageTooltip({ properties }: { properties: Record<string, unknown> }) {
  const name = String(properties.name ?? "Unknown");
  const stageType = String(properties.stageType ?? "") as StageType;
  const severityNum = Number(properties.severityNum ?? 0);
  const severityLabel = severityNum >= 2 ? "Critical" : severityNum >= 1 ? "Warning" : "Normal";
  const severityColor = severityNum >= 2 ? "#e74c3c" : severityNum >= 1 ? "#f5a623" : "#3f4550";

  return (
    <>
      <div className="mb-1 text-xs font-bold text-white/90 truncate max-w-[180px]">{name}</div>
      <div className="space-y-0.5 text-[10px] text-white/50">
        <div>
          <span
            className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/60"
          >
            {STAGE_LABELS[stageType] ?? stageType}
          </span>
        </div>
        {severityNum > 0 && (
          <div>
            <span className="text-white/30">Anomaly </span>
            <span className="font-bold" style={{ color: severityColor }}>
              {severityLabel}
            </span>
          </div>
        )}
      </div>
    </>
  );
}

const OFFSET = 12;

export function SupplyChainTooltip({ data }: { data: TooltipData | null }) {
  if (!data) return null;

  // Position tooltip to the right and below cursor, clamped to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: data.x + OFFSET,
    top: data.y + OFFSET,
    zIndex: 50,
    pointerEvents: "none",
  };

  return (
    <div
      style={style}
      className="border border-white/10 bg-black/85 px-3 py-2 backdrop-blur-xl shadow-lg max-w-[240px]"
    >
      {data.type === "batch" && <BatchTooltip properties={data.properties} />}
      {data.type === "route" && <RouteTooltip properties={data.properties} />}
      {data.type === "stage" && <StageTooltip properties={data.properties} />}
    </div>
  );
}
