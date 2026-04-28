import { PLATFORM_SPECS, type PlatformKey } from "./platforms";
import type { CompanyMemory, GenerationRequest } from "./types";

const platformDirections: Record<PlatformKey, string> = {
  facebook:
    "Horizontal feed creative with a clear focal area, balanced negative space, and room for a concise headline.",
  instagram:
    "Square editorial composition that feels polished on a mobile feed, with a strong central visual idea.",
  tiktok:
    "Vertical mobile-first composition with energetic depth, safe top and bottom margins, and a bold visual hook.",
  linkedin:
    "Professional B2B composition with confident hierarchy, credible polish, and space for a short business message.",
};

const banned =
  "Avoid copyrighted characters, famous brand imitation, political persuasion, illegal content, adult content, offensive content, and crowded text-heavy layouts.";

export function buildPrompt(input: GenerationRequest, platform: PlatformKey) {
  const spec = PLATFORM_SPECS[platform];
  const memory = summarizeMemory(input.companyMemory);
  const sessionVariation = createSessionVariation();

  return [
    `Create a high-quality static social media marketing image for ${spec.name}.`,
    `Company Name: ${input.companyName || "Provided company"}`,
    `Industry: ${input.industry || "General business"}`,
    `Campaign/Event: ${input.eventName || "Brand campaign"}`,
    `Content Type: ${input.contentType}`,
    `Tone: ${input.tone}`,
    `Brand Colors: ${input.brandColors || "Use refined brand-friendly colors"}`,
    "Logo Placement: Use the uploaded logo clearly but elegantly if available; keep it visible without dominating the design.",
    "Style: Premium, modern, clean, commercial advertising design.",
    `Platform Format: ${spec.size}. Compose for this aspect ratio.`,
    `Platform Direction: ${platformDirections[platform]}`,
    "Important: Leave safe space for text. Do not overcrowd. Use professional composition, strong visual hierarchy, and brand-friendly colors.",
    "Keep text minimal unless the user explicitly requests exact wording.",
    input.extraInstructions ? `Extra Instructions: ${input.extraInstructions}` : "",
    memory ? `Company Memory: ${memory}` : "",
    `Creative Variation: ${sessionVariation}. Generate a fresh unique creative direction for this session.`,
    banned,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRegenerationPrompt(args: {
  previousPrompt: string;
  userFeedback?: string;
  platform: PlatformKey;
}) {
  const spec = PLATFORM_SPECS[args.platform];

  return [
    args.previousPrompt,
    "",
    `Regenerate specifically for ${spec.name} at ${spec.size}.`,
    args.userFeedback ? `User feedback to apply: ${args.userFeedback}` : "",
    `New direction token: ${createSessionVariation()}.`,
    "Make the new image meaningfully different from the previous version while preserving the brand brief.",
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeMemory(memory?: CompanyMemory) {
  if (!memory) return "";

  const parts = [
    memory.preferredTone ? `Preferred tone: ${memory.preferredTone}` : "",
    memory.brandColors ? `Known brand colors: ${memory.brandColors}` : "",
    memory.previousCampaigns?.length
      ? `Previous campaigns: ${memory.previousCampaigns.slice(-5).join(", ")}`
      : "",
    memory.approvedStyles?.length
      ? `Approved styles: ${memory.approvedStyles.slice(-5).join(", ")}`
      : "",
    memory.rejectedStyles?.length
      ? `Avoid styles: ${memory.rejectedStyles.slice(-5).join(", ")}`
      : "",
    memory.userFeedback?.length
      ? `Recent feedback: ${memory.userFeedback.slice(-5).join("; ")}`
      : "",
  ];

  return parts.filter(Boolean).join(". ");
}

function createSessionVariation() {
  const moods = [
    "architectural light and elegant depth",
    "studio product-advertising polish",
    "premium editorial campaign energy",
    "clean spatial composition with a refined focal point",
    "modern launch-campaign art direction",
  ];
  const index = Math.floor(Math.random() * moods.length);
  return `${moods[index]} / ${crypto.randomUUID()}`;
}
