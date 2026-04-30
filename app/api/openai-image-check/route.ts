import { NextResponse } from "next/server";
import { runOpenAIImageCheck } from "@/lib/openai-diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runOpenAIImageCheck();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
