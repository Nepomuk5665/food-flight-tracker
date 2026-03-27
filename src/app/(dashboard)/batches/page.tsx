"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Filter, ChevronDown, ChevronUp } from "lucide-react";

type Batch = {
  lotCode: string;
  productName: string;
  status: string;
  riskScore: number;
  unitCount: number;
  createdAt: string;
};

const getRiskColor = (score: number) => {
  if (score <= 25) return "#3fa435"; // Green
  if (score <= 50) return "#f59e0b"; // Yellow
  if (score <= 75) return "#ea580c"; // Orange
  return "#dc2626"; // Red
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return <span className="bg-[#3fa435] text-white text-[10px] font-bold uppercase px-2 py-1">Active</span>;
    case "under_review":
      return <span className="bg-[#ea580c] text-white text-[10px] font-bold uppercase px-2 py-1">Under Review</span>;
    case "recalled":
      return <span className="bg-[#dc2626] text-white text-[10px] font-bold uppercase px-2 py-1">Recalled</span>;
    case "consumed":
      return <span className="bg-[#777777] text-white text-[10px] font-bold uppercase px-2 py-1">Consumed</span>;
    default:
      return <span className="bg-[#003a5d] text-white text-[10px] font-bold uppercase px-2 py-1">{status}</span>;
  }
};

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Batch; direction: "asc" | "desc" }>({
    key: "riskScore",
    direction: "desc",
  });

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch("/api/dashboard/overview");
        const json = await res.json();
        setBatches(json.data.batches);
      } catch (error) {
        console.error("Failed to fetch batches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const handleSort = (key: keyof Batch) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedBatches = [...batches].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const filteredBatches = sortedBatches.filter(
    (batch) =>
      batch.lotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-white border border-[#e2e8f0] animate-pulse" />
        <div className="h-[600px] bg-white border border-[#e2e8f0] animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#060606]">Batch Directory</h1>
        
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]" size={16} />
            <input
              type="text"
              placeholder="Search lot code or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] bg-white text-sm focus:outline-none focus:border-[#003a5d] transition-colors"
            />
          </div>
          <button className="bg-white border border-[#e2e8f0] p-2 text-[#424242] hover:bg-[#f8fafc] transition-colors flex items-center gap-2">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase hidden md:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-bold uppercase text-[#003a5d]">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("lotCode")}>
                  <div className="flex items-center gap-1">
                    Lot Code
                    {sortConfig.key === "lotCode" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("productName")}>
                  <div className="flex items-center gap-1">
                    Product
                    {sortConfig.key === "productName" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig.key === "status" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("riskScore")}>
                  <div className="flex items-center gap-1">
                    Risk Score
                    {sortConfig.key === "riskScore" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("unitCount")}>
                  <div className="flex items-center gap-1">
                    Units
                    {sortConfig.key === "unitCount" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center gap-1">
                    Created
                    {sortConfig.key === "createdAt" && (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch, index) => (
                <tr
                  key={batch.lotCode}
                  onClick={() => router.push(`/batch/${batch.lotCode}`)}
                  className={`
                    cursor-pointer border-b border-[#e2e8f0] last:border-0 hover:bg-[#f1f5f9] transition-colors
                    ${index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}
                  `}
                >
                  <td className="px-6 py-4 font-bold text-[#060606]">{batch.lotCode}</td>
                  <td className="px-6 py-4 text-[#424242]">{batch.productName}</td>
                  <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right font-bold" style={{ color: getRiskColor(batch.riskScore) }}>
                        {batch.riskScore}
                      </span>
                      <div className="w-24 h-1.5 bg-[#e2e8f0]">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${batch.riskScore}%`,
                            backgroundColor: getRiskColor(batch.riskScore),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#424242]">{batch.unitCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#777777] text-xs">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#777777]">
                    No batches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
