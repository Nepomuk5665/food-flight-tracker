"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { 
  Package, 
  Activity, 
  AlertTriangle, 
  ShieldAlert,
  Clock,
  ChevronRight
} from "lucide-react";

// Types based on API response
type Batch = { lotCode: string; productName: string; status: string; riskScore: number; unitCount: number; createdAt: string };
type Anomaly = { anomalyType: string; severity: string; description: string; detectedAt: string; batchId: string };
type Recall = { id: string; reason: string; severity: string; status: string; createdAt: string };
type Report = { id: string; lotCode: string; category: string; description: string; status: string; createdAt: string };
type Metrics = { totalBatches: number; activeBatches: number; criticalAnomalies: number; activeRecalls: number; consumerReports: number; avgRiskScore: number };

type DashboardData = {
  batches: Batch[];
  anomalies: Anomaly[];
  recalls: Recall[];
  reports: Report[];
  metrics: Metrics;
};

// Hardcoded coordinates for demo purposes
const DEMO_COORDS = [
  { lat: 46.76, lng: 6.86 }, // Henniez
  { lat: 48.13, lng: 11.58 }, // Munich
  { lat: 46.95, lng: 7.45 }, // Bern
  { lat: 47.37, lng: 8.54 }, // Zurich
  { lat: 46.20, lng: 6.14 }, // Geneva
];

const getRiskColor = (score: number) => {
  if (score <= 25) return "#3fa435"; // Green
  if (score <= 50) return "#f59e0b"; // Yellow
  if (score <= 75) return "#ea580c"; // Orange
  return "#dc2626"; // Red
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
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/dashboard/overview");
        const json = await res.json();
        setData(json.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] p-6 h-[120px] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[70%_30%] gap-6">
          <div className="bg-[#1a1a1a] min-h-[500px] border border-[#e2e8f0] animate-pulse" />
          <div className="bg-white border border-[#e2e8f0] min-h-[500px] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return <div>Error loading dashboard</div>;

  const { metrics, batches, anomalies, recalls, reports } = data;

  // Sort anomalies by severity
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Top Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-[#f7f9fa] text-[#003a5d]">
              <Package size={20} />
            </div>
            <div className="w-2 h-2 bg-[#3fa435] rounded-full"></div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-[#060606]">{metrics.activeBatches}</div>
            <div className="text-sm text-[#777777] uppercase tracking-wider font-semibold mt-1">Active Batches</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-[#f7f9fa] text-[#003a5d]">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold" style={{ color: getRiskColor(metrics.avgRiskScore) }}>
              {metrics.avgRiskScore.toFixed(1)}
            </div>
            <div className="text-sm text-[#777777] uppercase tracking-wider font-semibold mt-1">Avg Risk Score</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-[#f7f9fa] text-[#003a5d]">
              <AlertTriangle size={20} />
            </div>
            {metrics.criticalAnomalies > 0 && (
              <div className="text-xs font-bold text-[#dc2626] bg-[#dc2626]/10 px-2 py-1">CRITICAL</div>
            )}
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-bold ${metrics.criticalAnomalies > 0 ? 'text-[#dc2626]' : 'text-[#060606]'}`}>
              {metrics.criticalAnomalies}
            </div>
            <div className="text-sm text-[#777777] uppercase tracking-wider font-semibold mt-1">Critical Anomalies</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-[#f7f9fa] text-[#003a5d]">
              <ShieldAlert size={20} />
            </div>
            {metrics.activeRecalls > 0 && (
              <div className="w-2 h-2 bg-[#dc2626] rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-bold ${metrics.activeRecalls > 0 ? 'text-[#dc2626]' : 'text-[#060606]'}`}>
              {metrics.activeRecalls}
            </div>
            <div className="text-sm text-[#777777] uppercase tracking-wider font-semibold mt-1">Active Recalls</div>
          </div>
        </motion.div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 xl:grid-cols-[70%_30%] gap-6">
        
        {/* God View Map */}
        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] flex flex-col relative min-h-[500px]">
          <div className="absolute top-4 left-4 z-10 bg-[#0a0e1a] text-white px-4 py-2 flex items-center gap-3 border border-[#1a1f35] shadow-lg">
            <div className="w-2 h-2 bg-[#3fa435] rounded-full animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-widest">Live Tracking</span>
          </div>
          
          <div className="flex-1 w-full h-full bg-[#1a1a1a]">
            <Map
              mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              initialViewState={{
                longitude: 8.2275,
                latitude: 46.8182,
                zoom: 6.5
              }}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              style={{ width: '100%', height: '100%' }}
            >
              {batches.map((batch, i) => {
                const coord = DEMO_COORDS[i % DEMO_COORDS.length];
                const color = getRiskColor(batch.riskScore);
                return (
                  <Marker 
                    key={batch.lotCode} 
                    longitude={coord.lng} 
                    latitude={coord.lat}
                    anchor="center"
                    onClick={(e: any) => {
                      e.originalEvent.stopPropagation();
                      router.push(`/batch/${batch.lotCode}`);
                    }}
                  >
                    <div 
                      className="w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-150"
                      style={{ backgroundColor: color }}
                      title={`${batch.productName} (${batch.lotCode}) - Risk: ${batch.riskScore}`}
                    />
                  </Marker>
                );
              })}
            </Map>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={itemVariants} className="bg-white border border-[#e2e8f0] flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#003a5d]">Activity Feed</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Active Recalls */}
            {recalls.filter(r => r.status === 'active').length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-[#777777] flex items-center gap-2">
                  <ShieldAlert size={14} className="text-[#dc2626]" />
                  Active Recalls
                </h3>
                <div className="space-y-2">
                  {recalls.filter(r => r.status === 'active').map(recall => (
                    <div key={recall.id} className="border-l-4 border-[#dc2626] bg-[#f8fafc] p-3 cursor-pointer hover:bg-[#f1f5f9] transition-colors" onClick={() => router.push('/incidents')}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-[#dc2626] uppercase">{recall.severity}</span>
                        <span className="text-[10px] text-[#777777] flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(recall.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-[#424242] font-medium">{recall.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Alerts */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#777777] flex items-center gap-2">
                <AlertTriangle size={14} />
                Active Alerts
              </h3>
              <div className="space-y-2">
                {sortedAnomalies.slice(0, 5).map((anomaly, i) => (
                  <div 
                    key={i} 
                    className={`border-l-4 p-3 cursor-pointer hover:bg-[#f1f5f9] transition-colors bg-[#f8fafc] ${
                      anomaly.severity === 'critical' ? 'border-[#dc2626]' : 
                      anomaly.severity === 'high' ? 'border-[#ea580c]' : 'border-[#f59e0b]'
                    }`}
                    onClick={() => router.push(`/batch/${anomaly.batchId}`)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-[#060606]">{anomaly.anomalyType}</span>
                      <span className="text-[10px] text-[#777777] flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(anomaly.detectedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-sm text-[#424242] line-clamp-2">{anomaly.description}</p>
                    <div className="mt-2 text-[10px] font-semibold text-[#003a5d] uppercase flex items-center gap-1">
                      Batch {anomaly.batchId} <ChevronRight size={10} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#777777] flex items-center gap-2">
                <Activity size={14} />
                Recent Reports
              </h3>
              <div className="space-y-2">
                {reports.slice(0, 5).map(report => (
                  <div 
                    key={report.id} 
                    className="border border-[#e2e8f0] p-3 cursor-pointer hover:bg-[#f1f5f9] transition-colors"
                    onClick={() => router.push(`/batch/${report.lotCode}`)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-[#060606]">{report.category}</span>
                      <span className="text-[10px] text-[#777777] flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-[#424242] line-clamp-2">{report.description}</p>
                    <div className="mt-2 text-[10px] font-semibold text-[#003a5d] uppercase flex items-center gap-1">
                      Batch {report.lotCode} <ChevronRight size={10} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
