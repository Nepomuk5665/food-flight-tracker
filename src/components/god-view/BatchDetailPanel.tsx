"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ExternalLink, ChevronDown, MapPin, AlertTriangle, ArrowDown, GitMerge, GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GodViewBatch, GodViewBatchStage, GodViewLineageEdge } from "@/lib/types";
import { getStageIcon, getStageColor } from "@/components/journey/stage-icons";
import { RISK_COLORS } from "./god-view-map-layers";

interface BatchDetailPanelProps {
  batch: GodViewBatch | null;
  chainBatches?: GodViewBatch[];
  lineageEdges?: GodViewLineageEdge[];
  onClose: () => void;
  onNodeClick?: (lng: number, lat: number) => void;
  onBatchSelect?: (lotCode: string) => void;
}

/** Group consecutive stages that share the same physical location. */
interface LocationNode {
  key: string;
  locationName: string;
  lat: number;
  lng: number;
  stages: GodViewBatchStage[];
  totalAnomalies: number;
  worstSeverity: string | null;
}

function groupStagesByLocation(stages: GodViewBatchStage[]): LocationNode[] {
  const sorted = [...stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);
  const nodes: LocationNode[] = [];

  for (const stage of sorted) {
    const prev = nodes[nodes.length - 1];
    // Same location as previous? Group under that node.
    if (
      prev &&
      Math.abs(prev.lat - stage.location.lat) < 0.01 &&
      Math.abs(prev.lng - stage.location.lng) < 0.01
    ) {
      prev.stages.push(stage);
      prev.totalAnomalies += stage.anomalyCount;
      if (stage.maxSeverity && severityRank(stage.maxSeverity) > severityRank(prev.worstSeverity)) {
        prev.worstSeverity = stage.maxSeverity;
      }
    } else {
      nodes.push({
        key: stage.stageId,
        locationName: stage.location.name,
        lat: stage.location.lat,
        lng: stage.location.lng,
        stages: [stage],
        totalAnomalies: stage.anomalyCount,
        worstSeverity: stage.maxSeverity,
      });
    }
  }

  return nodes;
}

function severityRank(sev: string | null): number {
  if (!sev) return 0;
  const ranks: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return ranks[sev] ?? 0;
}

function severityColor(sev: string | null): string {
  if (sev === "critical") return RISK_COLORS.critical;
  if (sev === "high") return RISK_COLORS.warning;
  return "transparent";
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "border-white/20 text-white/80",
    under_review: "border-[#faad14]/40 text-[#faad14]",
    recalled: "border-[#ff4d4f]/40 text-[#ff4d4f]",
  };

  return (
    <span
      className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none bg-white/[0.03] ${
        colors[status] ?? "border-white/10 text-white/50"
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
      className="inline-flex items-center gap-1.5 border px-2 py-1 rounded-none bg-white/[0.03]"
      style={{ borderColor: `${color}40` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
      />
      <span className="text-xs font-bold" style={{ color }}>
        Risk {riskScore}
      </span>
    </div>
  );
}

function NodeItem({
  node,
  isExpanded,
  onToggle,
  onLocate,
}: {
  node: LocationNode;
  isExpanded: boolean;
  onToggle: () => void;
  onLocate: () => void;
}) {
  const primaryStage = node.stages[0];
  const hasAnomaly = node.totalAnomalies > 0;
  const sevColor = severityColor(node.worstSeverity);

  return (
    <li className="relative">
      {/* Timeline dot */}
      <span
        className="absolute -left-[21px] top-2.5 h-3 w-3 border-2 border-black rounded-none"
        style={{
          backgroundColor: hasAnomaly ? sevColor : getStageColor(primaryStage.type),
        }}
      />

      {/* Node header — tappable */}
      <button
        type="button"
        onClick={() => { onToggle(); onLocate(); }}
        className="group flex w-full items-start gap-2 text-left transition-colors hover:bg-white/[0.03] -mx-1 px-1 py-1 rounded-none"
      >
        <span style={{ color: hasAnomaly ? sevColor : getStageColor(primaryStage.type) }}>
          <MapPin size={16} className="mt-0.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-semibold text-white/90">
              {node.locationName}
            </p>
            {hasAnomaly && (
              <AlertTriangle size={12} style={{ color: sevColor }} className="flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-white/30">
            {node.stages.map((s) => s.type).join(" → ")}
            {hasAnomaly && (
              <span className="ml-1" style={{ color: sevColor }}>
                • {node.totalAnomalies} anomal{node.totalAnomalies === 1 ? "y" : "ies"}
              </span>
            )}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`mt-1 flex-shrink-0 text-white/20 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded sub-stages */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="ml-5 mt-1 mb-1 space-y-1.5 border-l border-white/[0.06] pl-3">
              {node.stages.map((stage) => (
                <li key={stage.stageId} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: getStageColor(stage.type) }}
                  >
                    {getStageIcon(stage.type)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-white/80">{stage.name}</p>
                    <p className="text-[10px] text-white/30">
                      {stage.type}
                      {stage.anomalyCount > 0 && (
                        <span className="ml-1 text-[#ff4d4f]">
                          • {stage.anomalyCount} anomal{stage.anomalyCount === 1 ? "y" : "ies"}
                          {stage.maxSeverity && ` (${stage.maxSeverity})`}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Topologically sort batches using lineage edges and group into tiers. */
function buildChainTiers(
  batches: GodViewBatch[],
  edges: GodViewLineageEdge[],
): GodViewBatch[][] {
  if (batches.length <= 1) return batches.map((b) => [b]);

  const batchByLot = new Map(batches.map((b) => [b.lotCode, b]));
  // Count incoming edges per batch
  const inDegree = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const b of batches) {
    inDegree.set(b.lotCode, 0);
    childrenOf.set(b.lotCode, []);
  }
  for (const e of edges) {
    if (!batchByLot.has(e.parentLotCode) || !batchByLot.has(e.childLotCode)) continue;
    inDegree.set(e.childLotCode, (inDegree.get(e.childLotCode) ?? 0) + 1);
    childrenOf.get(e.parentLotCode)?.push(e.childLotCode);
  }

  // BFS by tier (Kahn's algorithm, level-order)
  const tiers: GodViewBatch[][] = [];
  let frontier = batches.filter((b) => (inDegree.get(b.lotCode) ?? 0) === 0);
  const visited = new Set<string>();

  while (frontier.length > 0) {
    tiers.push(frontier);
    const nextSet = new Set<string>();
    for (const b of frontier) {
      visited.add(b.lotCode);
      for (const child of childrenOf.get(b.lotCode) ?? []) {
        const remaining = (inDegree.get(child) ?? 1) - 1;
        inDegree.set(child, remaining);
        if (remaining <= 0 && !visited.has(child)) nextSet.add(child);
      }
    }
    frontier = [...nextSet]
      .map((lot) => batchByLot.get(lot))
      .filter((b): b is GodViewBatch => b !== undefined);
  }

  // Add any unvisited batches (disconnected) as a final tier
  const remaining = batches.filter((b) => !visited.has(b.lotCode));
  if (remaining.length > 0) tiers.push(remaining);

  return tiers;
}

/** Determine the relationship label between two tiers. */
function tierRelationship(
  parentTier: GodViewBatch[],
  childTier: GodViewBatch[],
  edges: GodViewLineageEdge[],
): "merge" | "split" | null {
  for (const e of edges) {
    if (
      parentTier.some((b) => b.lotCode === e.parentLotCode) &&
      childTier.some((b) => b.lotCode === e.childLotCode)
    ) {
      return e.relationship;
    }
  }
  return null;
}

function ChainFlowSection({
  tiers,
  edges,
  selectedLotCode,
  onBatchSelect,
}: {
  tiers: GodViewBatch[][];
  edges: GodViewLineageEdge[];
  selectedLotCode: string;
  onBatchSelect?: (lotCode: string) => void;
}) {
  return (
    <div className="px-4 py-3 border-b border-white/[0.06]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Supply Chain Flow
      </p>
      <div className="space-y-0">
        {tiers.map((tier, ti) => {
          const rel = ti > 0 ? tierRelationship(tiers[ti - 1], tier, edges) : null;
          return (
            <div key={tier.map((b) => b.lotCode).join(",")}>
              {/* Connection arrow between tiers */}
              {ti > 0 && (
                <div className="flex items-center gap-1.5 py-1 pl-3">
                  <ArrowDown size={12} className="text-white/20" />
                  {rel && (
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      {rel === "merge" ? <GitMerge size={10} /> : <GitBranch size={10} />}
                      {rel}
                    </span>
                  )}
                </div>
              )}
              {/* Tier batches */}
              <div className="flex flex-wrap gap-1.5">
                {tier.map((b) => {
                  const isSelected = b.lotCode === selectedLotCode;
                  const riskColor = RISK_COLORS[b.riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.safe;
                  return (
                    <button
                      key={b.lotCode}
                      type="button"
                      onClick={() => onBatchSelect?.(b.lotCode)}
                      className={`flex items-center gap-1.5 border px-2 py-1.5 text-left transition-all rounded-none ${
                        isSelected
                          ? "border-white/30 bg-white/[0.08]"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: riskColor }}
                      />
                      <div className="min-w-0">
                        <p className={`truncate text-[11px] font-medium ${isSelected ? "text-white" : "text-white/70"}`}>
                          {b.lotCode}
                        </p>
                        <p className="truncate text-[9px] text-white/30">
                          {b.productName} · {b.stageCount} stages
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BatchDetailPanel({ batch, chainBatches, lineageEdges, onClose, onNodeClick, onBatchSelect }: BatchDetailPanelProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const nodes = batch ? groupStagesByLocation(batch.stages) : [];

  const chainTiers = batch && chainBatches && lineageEdges && chainBatches.length > 1
    ? buildChainTiers(chainBatches, lineageEdges)
    : null;

  return (
    <AnimatePresence>
      {batch && (
        <motion.aside
          key="batch-detail"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
          className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-white/[0.08] bg-black/80 backdrop-blur-2xl shadow-[-8px_0_32px_-8px_rgba(0,0,0,0.5)] rounded-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{batch.productName}</h2>
              <p className="mt-0.5 text-xs text-white/40">
                {batch.productBrand} &bull; {batch.lotCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1 text-white/30 transition-colors hover:text-white rounded-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Status + Risk */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <StatusBadge status={batch.status} />
            <RiskBadge riskLevel={batch.riskLevel} riskScore={batch.riskScore} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-px border-b border-white/[0.06] bg-white/[0.04]">
            {[
              { label: "Nodes", value: nodes.length },
              { label: "Anomalies", value: batch.anomalyCount },
              { label: "Units", value: batch.unitCount ?? "\u2014" },
            ].map((stat) => (
              <div key={stat.label} className="bg-black/60 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Chain flow (only when batch is part of a multi-batch chain) */}
          {chainTiers && lineageEdges && (
            <ChainFlowSection
              tiers={chainTiers}
              edges={lineageEdges}
              selectedLotCode={batch.lotCode}
              onBatchSelect={onBatchSelect}
            />
          )}

          {/* Node timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Supply Chain Nodes
            </p>
            <ul className="relative border-l border-white/[0.08] pl-4 space-y-2">
              {nodes.map((node) => (
                <NodeItem
                  key={node.key}
                  node={node}
                  isExpanded={expandedNode === node.key}
                  onToggle={() =>
                    setExpandedNode((prev) => (prev === node.key ? null : node.key))
                  }
                  onLocate={() => onNodeClick?.(node.lng, node.lat)}
                />
              ))}
            </ul>
          </div>

          {/* Footer link */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <Link
              href={`/batch/${batch.lotCode}`}
              className="flex items-center justify-center gap-2 border border-white/20 bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/80 transition-all duration-200 hover:bg-white/[0.1] hover:border-white/30 hover:text-white rounded-none"
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
