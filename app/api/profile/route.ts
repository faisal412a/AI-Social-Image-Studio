import { NextResponse } from "next/server";
import { clearProfile, getProfile } from "@/lib/profile-store";

export async function GET() {
  const profile = await getProfile();
  return NextResponse.json({ profile });
}

export async function DELETE() {
  const profile = await clearProfile();
  return NextResponse.json({ profile });
}
