import { NextRequest, NextResponse } from "next/server";
import {
  runOpenAIImageCheck,
  runOpenAIModelsCheck,
  summarizeImageCheck,
} from "@/lib/openai-diagnostics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const runImageTest = url.searchParams.get("image") === "1";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        openaiApiKeyConfigured: false,
        error: "OPENAI_API_KEY is not configured.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const modelsCheck = await runOpenAIModelsCheck();

  if (!modelsCheck.ok || !runImageTest) {
    return NextResponse.json(
      {
        ok: modelsCheck.ok,
        openaiApiKeyConfigured: true,
        modelsCheck,
        imageCheck: runImageTest ? undefined : "skipped",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const imageResult = await runOpenAIImageCheck();

  return NextResponse.json(
    {
      ok: modelsCheck.ok && imageResult.ok,
      openaiApiKeyConfigured: true,
      modelsCheck,
      imageCheck:
        "imageCheck" in imageResult
          ? imageResult.imageCheck
          : summarizeImageCheck({
              ok: false,
              status: 0,
              statusText: "request failed",
              error: imageResult.error,
            }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
