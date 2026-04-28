import { NextRequest, NextResponse } from "next/server";
import { generateImageForPlatform } from "@/lib/openai-images";
import { PLATFORM_SPECS, type PlatformKey } from "@/lib/platforms";
import { buildRegenerationPrompt } from "@/lib/prompt-builder";
import { saveProfile } from "@/lib/profile-store";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rateLimit = checkRateLimit(`regenerate:${ip}`, 16, 60_000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many regenerate requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const platform = body.platform as PlatformKey;

    if (!platform || !(platform in PLATFORM_SPECS)) {
      throw new Error("Choose a valid platform to regenerate.");
    }

    const previousPrompt = String(body.previousPrompt || "").trim();
    if (!previousPrompt) {
      throw new Error("Missing previous prompt.");
    }

    const userFeedback = String(body.userFeedback || "").trim();
    const prompt = buildRegenerationPrompt({ platform, previousPrompt, userFeedback });
    const generated = await generateImageForPlatform(prompt, platform);
    const spec = PLATFORM_SPECS[platform];

    if (userFeedback) {
      await saveProfile({ userFeedback: [userFeedback] });
    }

    return NextResponse.json({
      image: {
        platform,
        platformName: spec.name,
        size: spec.size,
        width: spec.width,
        height: spec.height,
        prompt,
        status: "generated",
        ...generated,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not regenerate image." },
      { status: 400 },
    );
  }
}
