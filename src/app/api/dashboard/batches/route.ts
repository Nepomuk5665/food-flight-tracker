import { NextResponse } from "next/server";
import { getAllBatches } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const rows = getAllBatches();

    const batches = rows.map(({ batch, product }) => ({
      lotCode: batch.lotCode,
      productName: product.name,
      status: batch.status,
      riskScore: batch.riskScore,
      unitCount: batch.unitCount ?? 0,
      createdAt: batch.createdAt,
    }));

    return NextResponse.json({ success: true, data: { batches } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load batches";
    return NextResponse.json(
      { success: false, error: { code: "BATCHES_ERROR", message } },
      { status: 500 },
    );
  }
}
