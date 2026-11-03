import { NextResponse } from "next/server";
import {
  buildAiContext,
  buildAiGuidance,
  callOpenAiGuidance,
  createGuidanceRateLimiter,
  hashClientIdentifier,
  parseAiGuidanceRequest,
} from "@/lib/ai/guidance-core";

const allowRequest = createGuidanceRateLimiter();

function isSameOrigin(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!originHeader || !host) return false;
  try {
    return new URL(originHeader).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "ORIGIN_REJECTED" }, { status: 403 });
  const clientIp = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  if (!allowRequest(hashClientIdentifier(clientIp))) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON_REQUIRED" }, { status: 415 });
  }

  try {
    const bodyText = await request.text();
    if (Buffer.byteLength(bodyText, "utf8") > 16_000) return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(bodyText); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
    const parsed = parseAiGuidanceRequest(body);
    if (!parsed) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const context = buildAiContext(parsed);
    if (!context) return NextResponse.json({ error: "ROUTE_NOT_AVAILABLE" }, { status: 409 });
    const fields = await callOpenAiGuidance(context);
    return NextResponse.json(buildAiGuidance(context, fields, new Date().toISOString()), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "AI_TIMEOUT" }, { status: 504 });
    }
    return NextResponse.json({ error: "AI_UNAVAILABLE" }, { status: 502 });
  }
}
