import { NextRequest, NextResponse } from "next/server";
import { saveLogo } from "@/lib/logo";
import { saveProfile } from "@/lib/profile-store";
import type { CompanyMemory } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const logoUrl = await saveLogo(formData.get("logoFile") as File | null);

    const update: Partial<CompanyMemory> = {
      companyName: getString(formData, "companyName"),
      industry: getString(formData, "industry"),
      brandColors: getString(formData, "brandColors"),
      preferredTone: getString(formData, "tone"),
      logoUrl: logoUrl || getString(formData, "logoUrl") || undefined,
      previousCampaigns: getList(formData, "previousCampaigns"),
      approvedStyles: getList(formData, "approvedStyles"),
      rejectedStyles: getList(formData, "rejectedStyles"),
      userFeedback: getList(formData, "userFeedback"),
    };

    const profile = await saveProfile(update);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save profile." },
      { status: 400 },
    );
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getList(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [value];
  } catch {
    return [value];
  }
}
