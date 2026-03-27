"use client";

import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GodViewBatch } from "@/lib/types";
import { getStageIcon, getStageColor } from "@/components/journey/stage-icons";
import { RISK_COLORS } from "./god-view-map-layers";

interface BatchDetailPanelProps {
  batch: GodViewBatch | null;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "border-[#9eca45] text-[#9eca45]",
    under_review: "border-[#f5a623] text-[#f5a623]",
    recalled: "border-[#e74c3c] text-[#e74c3c]",
  };

  return (
    <span
      className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-none ${
        colors[status] ?? "border-[#8b9db6] text-[#8b9db6]"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function RiskBadge({ riskLevel, riskScore }: { riskLevel: string; riskScore: number }) {
  const color = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.safe;

  return (
    <div
      className="inline-flex items-center gap-1.5 border px-2 py-1 rounded-none"
      style={{ borderColor: color }}
    >
      <span
        className="h-2.5 w-2.5 rounded-none"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-bold" style={{ color }}>
        Risk {riskScore}
      </span>
    </div>
  );
}

export function BatchDetailPanel({ batch, onClose }: BatchDetailPanelProps) {
  return (
    <AnimatePresence>
      {batch && (
        <motion.aside
          key="batch-detail"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
          className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-[#1e2a3a] bg-[#0f1923] shadow-2xl rounded-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#1e2a3a] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{batch.productName}</h2>
              <p className="mt-0.5 text-xs text-[#8b9db6]">
                {batch.productBrand} &bull; {batch.lotCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1 text-[#8b9db6] transition-colors hover:text-white rounded-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Status + Risk */}
          <div className="flex items-center gap-3 border-b border-[#1e2a3a] px-4 py-3">
            <StatusBadge status={batch.status} />
            <RiskBadge riskLevel={batch.riskLevel} riskScore={batch.riskScore} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-px border-b border-[#1e2a3a] bg-[#1e2a3a]">
            {[
              { label: "Stages", value: batch.stageCount },
              { label: "Anomalies", value: batch.anomalyCount },
              { label: "Units", value: batch.unitCount ?? "—" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0f1923] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-[#5a6a7a]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mini timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#8b9db6]">
              Supply Chain Journey
            </p>
            <ul className="relative border-l border-[#1e2a3a] pl-4">
              {batch.stages
                .sort((a, z) => a.sequenceOrder - z.sequenceOrder)
                .map((stage, idx) => (
                  <li key={stage.stageId} className="relative mb-3 last:mb-0">
                    {/* Timeline dot */}
                    <span
                      className="absolute -left-[21px] top-0.5 h-3 w-3 border-2 border-[#0f1923] rounded-none"
                      style={{ backgroundColor: getStageColor(stage.type) }}
                    />
                    <div className="flex items-start gap-2">
                      <span style={{ color: getStageColor(stage.type) }}>
                        {getStageIcon(stage.type)}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-white">{stage.name}</p>
                        <p className="text-[10px] text-[#5a6a7a]">
                          {stage.location.name}
                          {stage.anomalyCount > 0 && (
                            <span className="ml-1 text-[#e74c3c]">
                              &bull; {stage.anomalyCount} anomal{stage.anomalyCount === 1 ? "y" : "ies"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          {/* Footer link */}
          <div className="border-t border-[#1e2a3a] px-4 py-3">
            <Link
              href={`/batch/${batch.lotCode}`}
              className="flex items-center justify-center gap-2 border border-[#9eca45] bg-[#9eca45]/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#9eca45] transition-colors hover:bg-[#9eca45]/20 rounded-none"
            >
              View Full Detail
              <ExternalLink size={14} />
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
