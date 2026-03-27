import { NextResponse } from "next/server";
import { getGodViewData } from "@/lib/db/queries";
import type { ApiResponse, GodViewData } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const data = getGodViewData();
    return NextResponse.json({
      success: true,
      data,
    } satisfies ApiResponse<GodViewData>);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load overview data";
    return NextResponse.json(
      { success: false, error: { code: "OVERVIEW_ERROR", message } },
      { status: 500 },
    );
  }
}
