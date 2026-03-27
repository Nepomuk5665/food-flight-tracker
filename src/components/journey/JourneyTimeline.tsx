"use client";

import { ChevronRight } from "lucide-react";
import type { JourneyStage } from "@/lib/types";
import { getStageColor } from "./stage-icons";

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  const startStr = s.toLocaleDateString("en-GB", opts);
  if (!end) return `${startStr} — Ongoing`;
  const e = new Date(end);
  const endStr = e.toLocaleDateString("en-GB", opts);
  return `${startStr} — ${endStr}`;
}

export function JourneyTimeline({
  stages,
  activeStageId,
  onStageClick,
}: {
  stages: JourneyStage[];
  activeStageId: string | null;
  onStageClick: (stage: JourneyStage) => void;
}) {
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  return (
    <div className="px-5 pb-16 pt-2">
      <ol className="relative ml-3 border-l-2 border-[#e5e7eb]">
        {sorted.map((stage) => {
          const hasAnomaly = stage.anomalies.length > 0;
          const color = getStageColor(stage.type);
          const isActive = stage.stageId === activeStageId;

          return (
            <li
              key={stage.stageId}
              className={`relative pb-5 pl-7 last:pb-0 transition-opacity ${isActive ? "opacity-100" : "opacity-75 hover:opacity-100"}`}
            >
              {/* Timeline dot */}
              <span
                className="absolute -left-[7px] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-[3px] ring-[#fafafa]"
                style={{
                  backgroundColor: hasAnomaly ? "#ef4444" : color,
                }}
              />

              {/* Stage card */}
              <button
                type="button"
                className={`w-full rounded-2xl p-4 text-left transition-shadow ${
                  hasAnomaly
                    ? "bg-red-50 shadow-sm ring-1 ring-red-200"
                    : isActive
                      ? "bg-white shadow-md ring-1 ring-[#9eca45]/30"
                      : "bg-white shadow-sm ring-1 ring-black/[0.04]"
                }`}
                onClick={() => onStageClick(stage)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: color }}
                  >
                    {stage.type}
                  </span>
                  {hasAnomaly && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                      Alert
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mb-0.5 text-[15px] font-semibold text-[#1a1a2e]">
                      {stage.name}
                    </p>
                    <p className="mb-0.5 text-xs text-[#6b7280]">{stage.location.name}</p>
                    <p className="text-xs text-[#9ca3af]">
                      {formatDateRange(stage.startedAt, stage.completedAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#d1d5db]" />
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
