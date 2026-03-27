import { TriangleAlert } from "lucide-react";

const ALERTS = [
  "Chocolate batch C-CHOC-001 is under review.",
  "Dairy lot Y-CUP-001: packaging issue reported.",
];

export default function AlertsPage() {
  return (
    <section className="space-y-4 font-sans">
      <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Active Recalls</h1>

      <div className="space-y-3">
        {ALERTS.map((alert) => (
          <article
            key={alert}
            className="flex items-start gap-3 border border-[#dddddd] bg-white p-4 rounded-none"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 text-[#dc2626]" aria-hidden="true" />
            <p className="text-sm text-[#424242]">{alert}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
