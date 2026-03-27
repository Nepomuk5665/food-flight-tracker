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
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
};

export default function IncidentsPage() {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  
  // Form state
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState("high");
  const [lotCodes, setLotCodes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRecalls = async () => {
    try {
      const res = await fetch("/api/recalls");
      const json = await res.json();
      setRecalls(json.data?.recalls ?? []);
    } catch (error) {
      console.error("Failed to fetch recalls:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecalls();
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
          lotCodes: lotCodes.split(",").map(code => code.trim()).filter(Boolean)
        })
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
        body: JSON.stringify({ id, status: "resolved" })
      });
      
      if (res.ok) {
        fetchRecalls();
      }
    } catch (error) {
      console.error("Failed to end recall:", error);
    }
  };

  const activeRecalls = recalls.filter(r => r.status === "active");
  const resolvedRecalls = recalls.filter(r => r.status === "resolved");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-white border border-[#e2e8f0] animate-pulse" />
        <div className="h-48 bg-white border border-[#e2e8f0] animate-pulse" />
        <div className="h-48 bg-white border border-[#e2e8f0] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#060606] flex items-center gap-3">
            <ShieldAlert className="text-[#dc2626]" size={28} />
            Incident Response
          </h1>
          <p className="text-[#777777] mt-1 text-sm">Manage active product recalls and critical anomalies.</p>
        </div>
        
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-[#dc2626] text-white font-bold text-xs uppercase px-6 py-3 shadow-sm hover:bg-[#b91c1c] transition-all flex items-center gap-2"
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
            <form onSubmit={handleTriggerRecall} className="bg-white border border-[#dc2626] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-[#e2e8f0] pb-4">
                <AlertTriangle className="text-[#dc2626]" size={20} />
                <h2 className="text-lg font-bold uppercase text-[#dc2626]">Initiate New Recall</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-sm font-bold text-[#060606] uppercase">Reason for Recall</label>
                  <input 
                    required
                    type="text" 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Potential contamination with foreign objects"
                    className="w-full border border-[#dddddd] bg-white text-sm text-[#424242] px-4 py-3 focus:border-[#003a5d] focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#060606] uppercase">Severity Level</label>
                  <select 
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full border border-[#dddddd] bg-white text-sm text-[#424242] px-4 py-3 focus:border-[#003a5d] focus:outline-none transition-colors appearance-none"
                  >
                    <option value="critical">Critical (Immediate Action)</option>
                    <option value="high">High (Urgent)</option>
                    <option value="medium">Medium (Precautionary)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#060606] uppercase">Affected Lot Codes</label>
                  <input 
                    required
                    type="text" 
                    value={lotCodes}
                    onChange={(e) => setLotCodes(e.target.value)}
                    placeholder="Comma separated (e.g., LOT-123, LOT-456)"
                    className="w-full border border-[#dddddd] bg-white text-sm text-[#424242] px-4 py-3 focus:border-[#003a5d] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-[#dc2626] text-white font-bold text-xs uppercase px-8 py-3.5 shadow-sm hover:bg-[#b91c1c] transition-all disabled:opacity-50"
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
        <h2 className="text-xl font-bold uppercase tracking-wide text-[#060606] border-b border-[#dddddd] pb-2">
          Active Recalls ({activeRecalls.length})
        </h2>
        
        {activeRecalls.length === 0 ? (
          <div className="bg-white border border-[#e2e8f0] p-8 text-center text-[#777777]">
            <CheckCircle className="mx-auto mb-3 text-[#3fa435]" size={32} />
            <p className="text-sm uppercase tracking-wider font-bold">No active recalls</p>
            <p className="text-xs mt-1">All systems operating normally.</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {activeRecalls.map(recall => (
              <motion.div key={recall.id} variants={itemVariants} className="bg-white border border-[#e2e8f0] border-l-4 border-l-[#dc2626] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#dc2626] text-white text-[10px] font-bold uppercase px-2 py-1">
                      {recall.severity}
                    </span>
                    <span className="text-xs text-[#777777] flex items-center gap-1 font-semibold">
                      <Clock size={12} />
                      {new Date(recall.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-[#003a5d] font-bold uppercase bg-[#f7f9fa] px-2 py-1 border border-[#e2e8f0]">
                      ID: {recall.id.substring(0, 8)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-[#060606]">{recall.reason}</h3>
                  
                  {recall.affectedLots && recall.affectedLots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-[#777777] uppercase font-bold self-center mr-1">Affected Lots:</span>
                      {recall.affectedLots.map(lot => (
                        <span key={lot} className="text-xs bg-[#f8fafc] border border-[#e2e8f0] px-2 py-1 text-[#424242] font-mono">
                          {lot}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => handleEndRecall(recall.id)}
                  className="border border-[#dddddd] text-[#424242] font-bold text-xs uppercase px-6 py-3 hover:bg-[#f8fafc] hover:border-[#003a5d] hover:text-[#003a5d] transition-all shrink-0 w-full md:w-auto"
                >
                  Resolve Incident
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Resolved Recalls */}
      <div className="space-y-4 pt-8">
        <button 
          onClick={() => setShowResolved(!showResolved)}
          className="flex items-center gap-2 text-xl font-bold uppercase tracking-wide text-[#777777] hover:text-[#060606] transition-colors w-full border-b border-[#dddddd] pb-2 text-left"
        >
          {showResolved ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          Resolved Incidents ({resolvedRecalls.length})
        </button>
        
        <AnimatePresence>
          {showResolved && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {resolvedRecalls.length === 0 ? (
                <div className="bg-[#f8fafc] border border-[#e2e8f0] p-6 text-center text-[#777777] text-sm">
                  No resolved incidents found.
                </div>
              ) : (
                resolvedRecalls.map(recall => (
                  <div key={recall.id} className="bg-[#f8fafc] border border-[#e2e8f0] border-l-4 border-l-[#3fa435] p-5 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="bg-[#3fa435] text-white text-[10px] font-bold uppercase px-2 py-1">
                            Resolved
                          </span>
                          <span className="text-xs text-[#777777] font-semibold">
                            {new Date(recall.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#424242] line-through decoration-[#777777]">{recall.reason}</h3>
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
