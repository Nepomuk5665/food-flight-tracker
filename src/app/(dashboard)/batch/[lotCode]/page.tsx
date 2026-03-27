type BatchDetailPageProps = {
  params: Promise<{ lotCode: string }>;
};

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { lotCode } = await params;

  return (
    <section className="space-y-4 font-sans">
      <header className="grid gap-4 border border-[#dddddd] bg-white p-4 lg:grid-cols-[1fr_auto] rounded-none">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Batch Detail</h1>
          <p className="mt-2 text-sm text-[#777777]">Lot code: {lotCode}</p>
        </div>
        <div className="border border-[#dddddd] bg-[#f7f9fa] px-5 py-4 text-center rounded-none">
          <p className="text-xs font-bold uppercase text-[#003a5d]">Risk Score Gauge</p>
          <p className="mt-1 text-sm text-[#424242]">Placeholder</p>
        </div>
      </header>

      <div className="border border-[#dddddd] bg-[#111111] p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-white">Journey Map</h2>
        <div className="mt-3 min-h-[320px] border border-[#333333] bg-[#1a1a1a] p-4 text-sm text-[#bbbbbb] rounded-none">
          Batch journey map placeholder.
        </div>
      </div>

      <div className="border border-[#dddddd] bg-white p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Tabs</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Timeline",
            "Lineage",
            "Reports",
            "AI Analysis",
          ].map((tab) => (
            <div
              key={tab}
              className="border border-[#dddddd] bg-[#f7f9fa] px-3 py-2 text-xs font-semibold uppercase text-[#003a5d] rounded-none"
            >
              {tab}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
