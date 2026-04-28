import type { PlatformKey } from "./platforms";

export type ContentType = "Upcoming Event" | "Regular Marketing Content";
export type Tone = "Luxury" | "Corporate" | "Friendly" | "Bold" | "Minimal";

export type CompanyMemory = {
  companyName?: string;
  industry?: string;
  logoUrl?: string;
  brandColors?: string;
  preferredTone?: Tone | string;
  previousCampaigns: string[];
  approvedStyles: string[];
  rejectedStyles: string[];
  userFeedback: string[];
  updatedAt?: string;
};

export type GenerationRequest = {
  companyName: string;
  industry: string;
  contentType: ContentType;
  eventName: string;
  selectedPlatforms: PlatformKey[];
  tone: Tone;
  brandColors: string;
  extraInstructions?: string;
  logoUrl?: string;
  companyMemory?: CompanyMemory;
};

export type GeneratedImage = {
  platform: PlatformKey;
  platformName: string;
  size: string;
  width: number;
  height: number;
  imageBase64: string;
  imageUrl: string;
  prompt: string;
  status: "generated";
};
