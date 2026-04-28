import { NextRequest, NextResponse } from "next/server";
import { saveLogo } from "@/lib/logo";
import { generateImageForPlatform } from "@/lib/openai-images";
import { PLATFORM_SPECS, type PlatformKey } from "@/lib/platforms";
import { buildPrompt } from "@/lib/prompt-builder";
import { getProfile, saveProfile } from "@/lib/profile-store";
import { checkRateLimit } from "@/lib/rate-limit";
import type { GenerationRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const rateLimit = checkRateLimit(`generate:${ip}`, 8, 60_000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many image requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const formData = await request.formData();
    const logoUrl = await saveLogo(formData.get("logoFile") as File | null);
    const savedProfile = await getProfile();
    const input = parseGenerationForm(formData, { logoUrl, savedProfile });

    const images = await Promise.all(
      input.selectedPlatforms.map(async (platform) => {
        const spec = PLATFORM_SPECS[platform];
        const prompt = buildPrompt(input, platform);
        const generated = await generateImageForPlatform(prompt, platform);

        return {
          platform,
          platformName: spec.name,
          size: spec.size,
          width: spec.width,
          height: spec.height,
          prompt,
          status: "generated" as const,
          ...generated,
        };
      }),
    );

    const profile = await saveProfile({
      companyName: input.companyName,
      industry: input.industry,
      brandColors: input.brandColors,
      preferredTone: input.tone,
      logoUrl: input.logoUrl || savedProfile.logoUrl,
      previousCampaigns: input.eventName ? [input.eventName] : [],
    });

    return NextResponse.json({ images, profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 400 },
    );
  }
}

function parseGenerationForm(
  formData: FormData,
  context: { logoUrl?: string; savedProfile: Awaited<ReturnType<typeof getProfile>> },
): GenerationRequest {
  const selectedPlatforms = parsePlatforms(getString(formData, "selectedPlatforms"));

  if (!selectedPlatforms.length) {
    throw new Error("Choose at least one platform.");
  }

  return {
    companyName: getString(formData, "companyName") || context.savedProfile.companyName || "",
    industry: getString(formData, "industry") || context.savedProfile.industry || "",
    contentType:
      getString(formData, "contentType") === "Upcoming Event"
        ? "Upcoming Event"
        : "Regular Marketing Content",
    eventName: getString(formData, "eventName"),
    selectedPlatforms,
    tone: normalizeTone(getString(formData, "tone") || context.savedProfile.preferredTone),
    brandColors: getString(formData, "brandColors") || context.savedProfile.brandColors || "",
    extraInstructions: getString(formData, "extraInstructions"),
    logoUrl: context.logoUrl || context.savedProfile.logoUrl,
    companyMemory: context.savedProfile,
  };
}

function parsePlatforms(value: string): PlatformKey[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PlatformKey => item in PLATFORM_SPECS);
  } catch {
    return [];
  }
}

function normalizeTone(value?: string) {
  const allowed = ["Luxury", "Corporate", "Friendly", "Bold", "Minimal"] as const;
  return allowed.find((item) => item === value) || "Luxury";
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
