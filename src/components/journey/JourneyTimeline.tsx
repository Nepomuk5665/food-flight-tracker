"use client";

import { useState } from "react";
import { ChevronRight, GitMerge, GitBranch, ChevronDown } from "lucide-react";
import type { JourneyStage, LineageTree, LineageBatchJourney } from "@/lib/types";
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

function StageCard({
  stage,
  isActive,
  onClick,
  compact,
}: {
  stage: JourneyStage;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const hasAnomaly = stage.anomalies.length > 0;
  const color = getStageColor(stage.type);

  return (
    <button
      type="button"
      className={`w-full rounded-2xl p-4 text-left transition-shadow ${
        hasAnomaly
          ? "bg-red-50 shadow-sm ring-1 ring-red-200"
          : isActive
            ? "bg-white shadow-md ring-1 ring-[#9eca45]/30"
            : "bg-white shadow-sm ring-1 ring-black/[0.04]"
      } ${compact ? "py-3" : ""}`}
      onClick={onClick}
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
          <p className={`mb-0.5 font-semibold text-[#1a1a2e] ${compact ? "text-[13px]" : "text-[15px]"}`}>
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
  );
}

function LineageAnnotation({
  type,
  batches,
}: {
  type: "merge" | "split";
  batches: LineageBatchJourney[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isMerge = type === "merge";
  const Icon = isMerge ? GitMerge : GitBranch;
  const label = isMerge ? "Merged from" : "Split into";
  const borderColor = isMerge ? "border-[#003a5d]/30" : "border-[#777777]/30";
  const bgColor = isMerge ? "bg-[#003a5d]/5" : "bg-[#777777]/5";
  const iconColor = isMerge ? "text-[#003a5d]" : "text-[#777777]";

  return (
    <li className="relative pb-5 pl-7 last:pb-0">
      <span className={`absolute -left-[7px] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-[3px] ring-[#fafafa] ${isMerge ? "bg-[#003a5d]" : "bg-[#777777]"}`} />

      <button
        type="button"
        className={`w-full rounded-2xl border ${borderColor} ${bgColor} p-4 text-left transition-shadow hover:shadow-sm`}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold text-[#1a1a2e]">{label}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-[#9ca3af] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {batches.map((b) => (
            <span
              key={b.lotCode}
              className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#424242] ring-1 ring-black/[0.06]"
            >
              {b.lotCode}
              {b.ratio != null && b.ratio < 1 ? ` (${Math.round(b.ratio * 100)}%)` : ""}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className={`mt-2 ml-2 border-l-2 ${borderColor} pl-4 space-y-2`}>
          {batches.flatMap((b) =>
            [...b.stages]
              .sort((a, c) => a.sequenceOrder - c.sequenceOrder)
              .map((stage) => (
                <div key={stage.stageId} className="opacity-80">
                  <StageCard stage={stage} isActive={false} onClick={() => {}} compact />
                </div>
              )),
          )}
        </div>
      )}
    </li>
  );
}

export function JourneyTimeline({
  stages,
  activeStageId,
  onStageClick,
  lineageTree,
}: {
  stages: JourneyStage[];
  activeStageId: string | null;
  onStageClick: (stage: JourneyStage) => void;
  lineageTree?: LineageTree | null;
}) {
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const hasParents = (lineageTree?.parents.length ?? 0) > 0;
  const hasChildren = (lineageTree?.children.length ?? 0) > 0;

  return (
    <div className="px-5 pb-16 pt-2">
      <ol className="relative ml-3 border-l-2 border-[#e5e7eb]">
        {hasParents && (
          <LineageAnnotation
            type="merge"
            batches={lineageTree!.parents}
          />
        )}

        {sorted.map((stage) => {
          const hasAnomaly = stage.anomalies.length > 0;
          const color = getStageColor(stage.type);
          const isActive = stage.stageId === activeStageId;

          return (
            <li
              key={stage.stageId}
              className={`relative pb-5 pl-7 last:pb-0 transition-opacity ${isActive ? "opacity-100" : "opacity-75 hover:opacity-100"}`}
            >
              <span
                className="absolute -left-[7px] top-1 flex h-3 w-3 items-center justify-center rounded-full ring-[3px] ring-[#fafafa]"
                style={{ backgroundColor: hasAnomaly ? "#ef4444" : color }}
              />
              <StageCard
                stage={stage}
                isActive={isActive}
                onClick={() => onStageClick(stage)}
              />
            </li>
          );
        })}

        {hasChildren && (
          <LineageAnnotation
            type="split"
            batches={lineageTree!.children}
          />
        )}
      </ol>
    </div>
  );
}
