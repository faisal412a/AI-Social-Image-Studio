export type PlatformKey = "facebook" | "instagram" | "tiktok" | "linkedin";

export type PlatformSpec = {
  key: PlatformKey;
  name: string;
  size: string;
  width: number;
  height: number;
  generationSize: "1024x1024" | "1536x1024" | "1024x1536";
};

export const PLATFORM_SPECS: Record<PlatformKey, PlatformSpec> = {
  facebook: {
    key: "facebook",
    name: "Facebook",
    size: "1200 x 630 px",
    width: 1200,
    height: 630,
    generationSize: "1536x1024",
  },
  instagram: {
    key: "instagram",
    name: "Instagram",
    size: "1080 x 1080 px",
    width: 1080,
    height: 1080,
    generationSize: "1024x1024",
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok",
    size: "1080 x 1920 px",
    width: 1080,
    height: 1920,
    generationSize: "1024x1536",
  },
  linkedin: {
    key: "linkedin",
    name: "LinkedIn",
    size: "1200 x 627 px",
    width: 1200,
    height: 627,
    generationSize: "1536x1024",
  },
};

export const ALL_PLATFORMS = Object.values(PLATFORM_SPECS);
