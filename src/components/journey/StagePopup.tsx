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
    <div className="min-w-[220px] max-w-[280px] font-sans text-sm">
      <div
        className="mb-2 rounded-sm px-2 py-1 text-xs font-bold uppercase tracking-wide text-white"
        style={{ backgroundColor: color }}
      >
        {stage.type}
      </div>
      <h3 className="mb-1 text-sm font-bold text-[#003a5d]">{stage.name}</h3>
      <p className="mb-1 text-xs text-[#777777]">{stage.location.name}</p>
      <p className="mb-2 text-xs text-[#777777]">
        {formatDate(stage.startedAt)} — {formatDate(stage.completedAt)}
      </p>

      {stage.operator && (
        <p className="mb-2 text-xs">
          <span className="font-semibold text-[#424242]">Operator:</span>{" "}
          <span className="text-[#777777]">{stage.operator}</span>
        </p>
      )}

      {(stage.telemetry.avgTemperature != null || stage.telemetry.avgHumidity != null) && (
        <div className="mb-2 flex gap-3 text-xs">
          {stage.telemetry.avgTemperature != null && (
            <span className="text-[#424242]">
              Temp: {stage.telemetry.minTemperature}–{stage.telemetry.maxTemperature}°C
              (avg {stage.telemetry.avgTemperature}°C)
            </span>
          )}
          {stage.telemetry.avgHumidity != null && (
            <span className="text-[#424242]">Humidity: {stage.telemetry.avgHumidity}%</span>
          )}
        </div>
      )}

      {hasAnomaly && (
        <div className="mt-2 rounded-sm border border-red-300 bg-red-50 px-2 py-1.5">
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
