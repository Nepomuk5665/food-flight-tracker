"use client";

import type { JourneyStage } from "@/lib/types";
import { getStageColor } from "./stage-icons";

function formatDate(iso: string | null): string {
  if (!iso) return "Ongoing";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StagePopup({ stage }: { stage: JourneyStage }) {
  const hasAnomaly = stage.anomalies.length > 0;
  const color = getStageColor(stage.type);

  return (
    <div className="min-w-[220px] max-w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-4 font-sans text-sm shadow-lg">
      <div className="mb-3 flex items-center">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {stage.type}
        </span>
      </div>
      <h3 className="mb-1 text-sm font-bold text-[#1A1A1A]">{stage.name}</h3>
      <p className="mb-1 text-xs text-[#9CA3AF]">{stage.location.name}</p>
      <p className="mb-3 text-xs text-[#9CA3AF]">
        {formatDate(stage.startedAt)} — {formatDate(stage.completedAt)}
      </p>

      {stage.operator && (
        <p className="mb-3 text-xs">
          <span className="font-semibold text-[#374151]">Operator:</span>{" "}
          <span className="text-[#9CA3AF]">{stage.operator}</span>
        </p>
      )}

      {(stage.telemetry.avgTemperature != null || stage.telemetry.avgHumidity != null) && (
        <div className="mb-3 flex gap-3 text-xs">
          {stage.telemetry.avgTemperature != null && (
            <span className="text-[#374151]">
              Temp: {stage.telemetry.minTemperature}–{stage.telemetry.maxTemperature}°C
              (avg {stage.telemetry.avgTemperature}°C)
            </span>
          )}
          {stage.telemetry.avgHumidity != null && (
            <span className="text-[#374151]">Humidity: {stage.telemetry.avgHumidity}%</span>
          )}
        </div>
      )}

      {hasAnomaly && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2">
          {stage.anomalies.map((a) => (
            <p key={a.id} className="text-xs font-medium text-red-700">
              {a.description}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
