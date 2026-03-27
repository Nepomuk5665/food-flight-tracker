"use client";

import { useParams } from "next/navigation";

export default function JourneyPage() {
  const params = useParams<{ lotCode: string }>();
  const lotCode = params.lotCode;

  return (
    <section className="space-y-4 font-sans">
      <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Batch Journey</h1>

      <div className="border border-[#dddddd] bg-[#eeeeee] p-6 text-center rounded-none">
        <p className="text-base text-[#424242]">Map will render here</p>
        <p className="mt-2 text-xs font-semibold uppercase text-[#777777]">Lot: {lotCode}</p>
      </div>

      <div className="border border-[#dddddd] bg-white p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Timeline</h2>
        <ul className="mt-3 space-y-2 text-sm text-[#424242]">
          <li className="border-l-2 border-[#9eca45] pl-3">Stage 1 placeholder</li>
          <li className="border-l-2 border-[#9eca45] pl-3">Stage 2 placeholder</li>
          <li className="border-l-2 border-[#9eca45] pl-3">Stage 3 placeholder</li>
        </ul>
      </div>
    </section>
  );
}
