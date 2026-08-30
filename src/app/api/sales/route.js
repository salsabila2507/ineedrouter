import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const GATEWAY_URL = process.env.INEED_GATEWAY_URL || "http://127.0.0.1:8090";

export async function GET() {
  try {
    const response = await fetch(`${GATEWAY_URL}/internal/sales-summary`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Gateway sales summary returned ${response.status}`);
    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load sales data" }, { status: 502 });
  }
}

export async function POST(request) {
  try {
    const response = await fetch(GATEWAY_URL + "/internal/confirm-support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await request.json()),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Konfirmasi gagal" }, { status: 502 });
  }
}
