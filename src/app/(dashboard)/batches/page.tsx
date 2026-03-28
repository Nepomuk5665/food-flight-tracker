"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  if (score <= 25) return "#52c41a";
  if (score <= 50) return "#faad14";
  if (score <= 75) return "#fa8c16";
  return "#ff4d4f";
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    active: "border-white/20 text-white/80 bg-white/[0.06]",
    under_review: "border-[#faad14]/30 text-[#faad14] bg-[#faad14]/[0.06]",
    recalled: "border-[#ff4d4f]/30 text-[#ff4d4f] bg-[#ff4d4f]/[0.06]",
    consumed: "border-white/10 text-white/40 bg-white/[0.03]",
  };

  const style = styles[status.toLowerCase()] ?? "border-white/10 text-white/50 bg-white/[0.03]";

  return (
    <span className={`border text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${style}`}>
      {status.replace("_", " ")}
    </span>
  );
};

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Batch; direction: "asc" | "desc" }>({
    key: "riskScore",
    direction: "desc",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchBatches = async (attempt = 0) => {
      try {
        const res = await fetch("/api/dashboard/batches");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
        if (!cancelled) {
          setBatches(json.data?.batches ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && attempt < 2) {
          setTimeout(() => fetchBatches(attempt + 1), 1000 * (attempt + 1));
          return;
        }
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load batches";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBatches();

    return () => { cancelled = true; };
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
      <div className="space-y-6 p-6">
        <div className="h-12 border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        <div className="h-[600px] border border-white/[0.06] bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6">
        <div className="border border-[#ff4d4f]/20 bg-[#ff4d4f]/5 px-8 py-6 text-center backdrop-blur-2xl">
          <p className="text-sm font-bold text-[#ff4d4f]">Failed to load batches</p>
          <p className="mt-1 text-xs text-white/40">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
            className="mt-4 border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:bg-white/[0.1] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 p-6 animate-[fadeSlideIn_0.5s_ease-out]"
      style={{ "--tw-enter-opacity": "0", "--tw-enter-translate-y": "20px" } as React.CSSProperties}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-white">Batch Directory</h1>

        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input
              type="text"
              placeholder="Search lot code or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button className="border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-2.5 text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all flex items-center gap-2">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase hidden md:inline">Filter</span>
          </button>
        </div>
      </div>

      <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-white/40">
              <tr>
                {(
                  [
                    { key: "lotCode" as const, label: "Lot Code" },
                    { key: "productName" as const, label: "Product" },
                    { key: "status" as const, label: "Status" },
                    { key: "riskScore" as const, label: "Risk Score" },
                    { key: "unitCount" as const, label: "Units" },
                    { key: "createdAt" as const, label: "Created" },
                  ] as const
                ).map((col) => (
                  <th
                    key={col.key}
                    className="px-6 py-4 cursor-pointer hover:bg-white/[0.03] hover:text-white/60 transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortConfig.key === col.key &&
                        (sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch, index) => (
                <tr
                  key={batch.lotCode}
                  onClick={() => router.push(`/batch/${batch.lotCode}`)}
                  className={`cursor-pointer border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors ${
                    index % 2 === 0 ? "" : "bg-white/[0.01]"
                  }`}
                >
                  <td className="px-6 py-4 font-bold text-white">{batch.lotCode}</td>
                  <td className="px-6 py-4 text-white/60">{batch.productName}</td>
                  <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right font-bold" style={{ color: getRiskColor(batch.riskScore) }}>
                        {batch.riskScore}
                      </span>
                      <div className="w-24 h-1 bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${batch.riskScore}%`,
                            backgroundColor: getRiskColor(batch.riskScore),
                            boxShadow: `0 0 8px ${getRiskColor(batch.riskScore)}40`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/50">{batch.unitCount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-white/30 text-xs">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20">
                    No batches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
