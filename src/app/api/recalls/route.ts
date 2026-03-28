import { NextResponse } from "next/server";
import { getAllRecalls, createRecall, endRecall, getReportAggregates } from "@/lib/db/queries";
import { emitRecallCreated } from "@/lib/recall-events";
import "@/lib/push/send-notifications"; // side-effect: registers recall listener

export async function GET() {
  const recalls = getAllRecalls();
  const reportAggregates = getReportAggregates();
  return NextResponse.json({ success: true, data: { recalls, reportAggregates } });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { reason, severity, triggeredBy, affectedRegions, lotCodes } = body;

  if (!reason || !lotCodes?.length) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "reason and lotCodes are required" } },
      { status: 400 },
    );
  }

  const recall = createRecall({
    reason,
    severity: severity ?? "critical",
    triggeredBy: triggeredBy ?? "system",
    affectedRegions: affectedRegions ?? [],
    lotCodes,
  });

  try {
    emitRecallCreated({
      recallId: recall.id,
      reason,
      severity: severity ?? "critical",
      lotCodes,
    });
  } catch {
    // best-effort — notification failure must not affect recall creation
  }

  return NextResponse.json({
    success: true,
    data: {
      recallId: recall.id,
      status: "active",
      affectedLots: recall.affectedLots,
      estimatedUnits: recall.estimatedUnits,
    },
  });
}

export async function PATCH(request: Request) {
  const { recallId, action } = await request.json();

  if (action === "end" && recallId) {
    endRecall(recallId);
    return NextResponse.json({ success: true, data: { status: "ended" } });
  }

  return NextResponse.json(
    { success: false, error: { code: "INVALID_ACTION", message: "Unsupported action" } },
    { status: 400 },
  );
}
