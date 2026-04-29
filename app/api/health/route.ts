import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    openaiApiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    openaiImageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    openaiImageQuality: process.env.OPENAI_IMAGE_QUALITY || "medium",
  });
}
