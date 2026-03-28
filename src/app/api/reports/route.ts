import { NextResponse } from "next/server";
import { createConsumerReport, getReportCountForDevice } from "@/lib/db/queries";
import type { ReportCategory } from "@/lib/types";

const VALID_CATEGORIES: ReportCategory[] = [
  "taste_quality",
  "appearance",
  "packaging",
  "foreign_object",
  "allergic_reaction",
  "other",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lotCode, deviceId, category, description, photoUrl } = body;

    // Validate required fields
    if (!lotCode || !deviceId || !category) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "lotCode, deviceId, and category are required" },
        },
        { status: 400 },
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CATEGORY",
            message: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
          },
        },
        { status: 400 },
      );
    }

    // Validate description length
    if (description && description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DESCRIPTION_TOO_LONG", message: "description must be 500 characters or less" },
        },
        { status: 400 },
      );
    }

    // Rate limit: check reports from this device in the last hour
    const recentReportCount = getReportCountForDevice(deviceId, 1);
    if (recentReportCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many reports from this device. Try again later." },
        },
        { status: 429 },
      );
    }

    // Create the report
    const report = createConsumerReport({
      lotCode,
      deviceId,
      category,
      description: description ?? null,
      photoUrl: photoUrl ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          reportId: report.id,
          status: "new",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating consumer report:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create report" },
      },
      { status: 500 },
    );
  }
}
