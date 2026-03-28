"use client";

import { X } from "lucide-react";
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

export function StagePopup({ stage, onClose }: { stage: JourneyStage; onClose: () => void }) {
  const hasAnomaly = stage.anomalies.length > 0;
  const color = getStageColor(stage.type);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A2E]/90 p-4 font-sans text-sm shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {stage.type}
        </span>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <h3 className="mb-1 text-sm font-bold text-white">{stage.name}</h3>
      <p className="mb-1 text-xs text-white/50">{stage.location.name}</p>
      <p className="mb-3 text-xs text-white/40">
        {formatDate(stage.startedAt)} — {formatDate(stage.completedAt)}
      </p>

      {stage.operator && (
        <p className="mb-3 text-xs">
          <span className="font-semibold text-white/70">Operator:</span>{" "}
          <span className="text-white/50">{stage.operator}</span>
        </p>
      )}

      {(stage.telemetry.avgTemperature != null || stage.telemetry.avgHumidity != null) && (
        <div className="mb-3 flex gap-3 text-xs">
          {stage.telemetry.avgTemperature != null && (
            <span className="text-white/70">
              Temp: {stage.telemetry.minTemperature}–{stage.telemetry.maxTemperature}°C
              (avg {stage.telemetry.avgTemperature}°C)
            </span>
          )}
          {stage.telemetry.avgHumidity != null && (
            <span className="text-white/70">Humidity: {stage.telemetry.avgHumidity}%</span>
          )}
        </div>
      )}

      {hasAnomaly && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
          {stage.anomalies.map((a) => (
            <p key={a.id} className="text-xs font-medium text-red-400">
              {a.description}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
