import { NextResponse } from "next/server";
import { recordDeviceScan } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, barcode } = body;

    if (!deviceId || !barcode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = recordDeviceScan(deviceId, barcode);
    return NextResponse.json(
      { success: true },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    console.error("Error recording device scan:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
