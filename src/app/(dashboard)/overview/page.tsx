export default function OverviewPage() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr] font-sans">
      <div className="border border-[#222222] bg-[#111111] p-6 rounded-none">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-white">God View</h1>
        <div className="mt-4 min-h-[420px] border border-[#333333] bg-[#1a1a1a] p-4 text-sm text-[#bbbbbb] rounded-none">
          Dark map placeholder for clustered active batches.
        </div>
      </div>

      <div className="space-y-4">
        <article className="border border-[#dddddd] bg-white p-4 rounded-none">
          <h2 className="text-xs font-bold uppercase text-[#003a5d]">Active Alerts</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Critical temperature anomaly • L6029479302</li>
            <li>Monitoring humidity spike • Y-CUP-001</li>
          </ul>
        </article>

        <article className="border border-[#dddddd] bg-white p-4 rounded-none">
          <h2 className="text-xs font-bold uppercase text-[#003a5d]">Recent Reports</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Tastes stale • ChocoTrace</li>
            <li>Packaging bulging • AlpenMilch</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
