import { promises as fs } from "fs";
import path from "path";
import type { CompanyMemory } from "./types";

const dataDir = path.join(process.cwd(), "data");
const profilePath = path.join(dataDir, "profile.json");

const emptyProfile: CompanyMemory = {
  previousCampaigns: [],
  approvedStyles: [],
  rejectedStyles: [],
  userFeedback: [],
};

export async function getProfile(): Promise<CompanyMemory> {
  try {
    const raw = await fs.readFile(profilePath, "utf8");
    return { ...emptyProfile, ...JSON.parse(raw) };
  } catch {
    return emptyProfile;
  }
}

export async function saveProfile(update: Partial<CompanyMemory>) {
  await fs.mkdir(dataDir, { recursive: true });
  const current = await getProfile();
  const next: CompanyMemory = {
    ...current,
    ...update,
    previousCampaigns: mergeList(current.previousCampaigns, update.previousCampaigns),
    approvedStyles: mergeList(current.approvedStyles, update.approvedStyles),
    rejectedStyles: mergeList(current.rejectedStyles, update.rejectedStyles),
    userFeedback: mergeList(current.userFeedback, update.userFeedback),
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(profilePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function clearProfile() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(profilePath, JSON.stringify(emptyProfile, null, 2), "utf8");
  return emptyProfile;
}

function mergeList(current: string[] = [], incoming?: string[]) {
  const merged = [...current, ...(incoming || [])]
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(merged)).slice(-30);
}
