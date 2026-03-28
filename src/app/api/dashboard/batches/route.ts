import { NextResponse } from "next/server";
import { getAllBatchesGrouped } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const chains = getAllBatchesGrouped();

    return NextResponse.json({ success: true, data: { chains } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load batches";
    return NextResponse.json(
      { success: false, error: { code: "BATCHES_ERROR", message } },
      { status: 500 },
    );
  }
}
