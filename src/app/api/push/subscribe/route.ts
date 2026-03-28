import { NextResponse } from "next/server";
import { upsertPushSubscription, deletePushSubscription } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, endpoint, keys } = body;

    if (!deviceId || !endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = upsertPushSubscription({
      deviceId,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
    });

    return NextResponse.json(
      { success: true },
      { status: result.created ? 201 : 200 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Missing endpoint" },
        { status: 400 },
      );
    }

    deletePushSubscription(endpoint);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
