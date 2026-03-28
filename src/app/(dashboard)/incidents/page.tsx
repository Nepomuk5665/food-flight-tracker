"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert, Plus, X, CheckCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";

type Recall = {
  id: string;
  reason: string;
  severity: string;
  status: string;
  createdAt: string;
  affectedLots?: string[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function IncidentsPage() {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState("high");
  const [lotCodes, setLotCodes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRecalls = async (attempt = 0) => {
    try {
      const res = await fetch("/api/recalls");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecalls(json.data?.recalls ?? []);
      setError(null);
    } catch (err) {
      if (attempt < 2) {
        setTimeout(() => fetchRecalls(attempt + 1), 1000 * (attempt + 1));
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load incidents";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTriggerRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/recalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          severity,
          lotCodes: lotCodes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setReason("");
        setSeverity("high");
        setLotCodes("");
        fetchRecalls();
      }
    } catch (error) {
      console.error("Failed to trigger recall:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndRecall = async (id: string) => {
    try {
      const res = await fetch("/api/recalls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "resolved" }),
      });

      if (res.ok) {
        fetchRecalls();
      }
    } catch (error) {
      console.error("Failed to end recall:", error);
    }
  };

  const activeRecalls = recalls.filter((r) => r.status === "active");
  const resolvedRecalls = recalls.filter((r) => r.status === "resolved");

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-12 border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        <div className="h-48 border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        <div className="h-48 border border-white/[0.06] bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6">
        <div className="border border-[#ff4d4f]/20 bg-[#ff4d4f]/5 px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-sm font-bold text-[#ff4d4f]">Failed to load incidents</p>
          <p className="mt-1 text-xs text-white/40">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchRecalls(); }}
            className="mt-4 border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/[0.1] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-3">
            <ShieldAlert className="text-[#ff4d4f]" size={24} />
            Incident Response
          </h1>
          <p className="text-white/30 mt-1 text-sm">Manage active product recalls and critical anomalies.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f] font-bold text-xs uppercase tracking-wider px-6 py-3 hover:bg-[#ff4d4f]/20 hover:border-[#ff4d4f]/40 transition-all flex items-center gap-2 backdrop-blur-2xl"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Trigger Recall"}
        </button>
      </div>

      {/* Trigger Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleTriggerRecall}
              className="border border-[#ff4d4f]/20 bg-white/[0.02] backdrop-blur-2xl p-6 shadow-[0_0_24px_-8px_rgba(255,77,79,0.15)]"
            >
              <div className="flex items-center gap-2 mb-6 border-b border-white/[0.06] pb-4">
                <AlertTriangle className="text-[#ff4d4f]" size={18} />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#ff4d4f]">Initiate New Recall</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    Reason for Recall
                  </label>
                  <input
                    required
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Potential contamination with foreign objects"
                    className="w-full border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 px-4 py-3 focus:border-white/20 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full border border-white/[0.08] bg-white/[0.03] text-sm text-white px-4 py-3 focus:border-white/20 focus:outline-none transition-colors appearance-none"
                  >
                    <option value="critical">Critical (Immediate Action)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="medium">Medium (Precautionary)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    Affected Lot Codes
                  </label>
                  <input
                    required
                    type="text"
                    value={lotCodes}
                    onChange={(e) => setLotCodes(e.target.value)}
                    placeholder="Comma separated (e.g., LOT-123, LOT-456)"
                    className="w-full border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 px-4 py-3 focus:border-white/20 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f] font-bold text-xs uppercase tracking-wider px-8 py-3.5 hover:bg-[#ff4d4f]/20 transition-all disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Confirm & Broadcast Recall"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Recalls */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/50 border-b border-white/[0.06] pb-3">
          Active Recalls ({activeRecalls.length})
        </h2>

        {activeRecalls.length === 0 ? (
          <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-8 text-center">
            <CheckCircle className="mx-auto mb-3 text-[#52c41a]/60" size={28} />
            <p className="text-xs uppercase tracking-wider font-bold text-white/40">No active recalls</p>
            <p className="text-xs mt-1 text-white/20">All systems operating normally.</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            {activeRecalls.map((recall) => (
              <motion.div
                key={recall.id}
                variants={itemVariants}
                className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-l-2 border-l-[#ff4d4f] shadow-[0_0_20px_-8px_rgba(255,77,79,0.15)]"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 text-[#ff4d4f] text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                      {recall.severity}
                    </span>
                    <span className="text-xs text-white/30 flex items-center gap-1 font-semibold">
                      <Clock size={12} />
                      {new Date(recall.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                      {recall.id.substring(0, 8)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white/90">{recall.reason}</h3>

                  {recall.affectedLots && recall.affectedLots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider self-center mr-1">
                        Affected:
                      </span>
                      {recall.affectedLots.map((lot) => (
                        <span
                          key={lot}
                          className="text-xs border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-white/50 font-mono"
                        >
                          {lot}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleEndRecall(recall.id)}
                  className="border border-white/[0.12] bg-white/[0.03] text-white/50 font-bold text-xs uppercase tracking-wider px-6 py-3 hover:bg-white/[0.06] hover:text-white/80 hover:border-white/20 transition-all shrink-0 w-full md:w-auto"
                >
                  Resolve Incident
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Resolved Recalls */}
      <div className="space-y-4 pt-4">
        <button
          onClick={() => setShowResolved(!showResolved)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors w-full border-b border-white/[0.06] pb-3 text-left"
        >
          {showResolved ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Resolved Incidents ({resolvedRecalls.length})
        </button>

        <AnimatePresence>
          {showResolved && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {resolvedRecalls.length === 0 ? (
                <div className="border border-white/[0.06] bg-white/[0.02] p-6 text-center text-white/20 text-sm">
                  No resolved incidents found.
                </div>
              ) : (
                resolvedRecalls.map((recall) => (
                  <div
                    key={recall.id}
                    className="border border-white/[0.06] bg-white/[0.01] p-5 opacity-60 hover:opacity-100 transition-opacity border-l-2 border-l-[#52c41a]/40"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="border border-[#52c41a]/20 bg-[#52c41a]/[0.06] text-[#52c41a] text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                            Resolved
                          </span>
                          <span className="text-xs text-white/20 font-semibold">
                            {new Date(recall.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white/40 line-through decoration-white/20">
                          {recall.reason}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
