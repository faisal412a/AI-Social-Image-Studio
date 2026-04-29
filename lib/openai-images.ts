import OpenAI from "openai";
import { PLATFORM_SPECS, type PlatformKey } from "./platforms";

const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const imageQuality = process.env.OPENAI_IMAGE_QUALITY || "medium";
const requestTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120_000);

export async function generateImageForPlatform(prompt: string, platform: PlatformKey) {
  if (!process.env.OPENAI_API_KEY) {
    return createDemoImage(platform);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: requestTimeoutMs,
  });
  const spec = PLATFORM_SPECS[platform];

  const response = await withImageRetry(() =>
    client.images.generate({
      model,
      prompt,
      size: spec.generationSize,
      quality: imageQuality as "low" | "medium" | "high" | "auto",
      n: 1,
    }),
  );

  const image = response.data?.[0];
  const base64 = image?.b64_json;

  if (!base64) {
    throw new Error("OpenAI did not return image data.");
  }

  return {
    imageBase64: base64,
    imageUrl: `data:image/png;base64,${base64}`,
  };
}

async function withImageRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientOpenAIError(error)) break;
      await wait(900 * attempt);
    }
  }

  throw normalizeOpenAIError(lastError);
}

function isTransientOpenAIError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;

  return (
    message.includes("connection") ||
    message.includes("timeout") ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    status >= 500
  );
}

function normalizeOpenAIError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("OpenAI image generation failed. Please try again.");
  }

  const message = error.message.toLowerCase();
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;

  if (message.includes("connection") || message.includes("timeout")) {
    return new Error(
      "The server could not maintain a connection to OpenAI. Try generating one or two platforms first, then regenerate the rest.",
    );
  }

  if (status === 401) {
    return new Error("OpenAI rejected the API key. Check OPENAI_API_KEY in Railway and redeploy.");
  }

  if (status === 429) {
    return new Error("OpenAI rate limit or quota was reached. Please wait a bit or check billing/usage.");
  }

  return error;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDemoImage(platform: PlatformKey) {
  const spec = PLATFORM_SPECS[platform];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#10141f"/>
          <stop offset="0.52" stop-color="#1d9a8a"/>
          <stop offset="1" stop-color="#f36b5f"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="${spec.width * 0.08}" y="${spec.height * 0.12}" width="${spec.width * 0.84}" height="${spec.height * 0.76}" rx="28" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.34)"/>
      <text x="${spec.width * 0.1}" y="${spec.height * 0.42}" fill="white" font-family="Arial, sans-serif" font-size="${Math.max(34, spec.width * 0.055)}" font-weight="700">AI Social Image Studio</text>
      <text x="${spec.width * 0.1}" y="${spec.height * 0.52}" fill="rgba(255,255,255,0.84)" font-family="Arial, sans-serif" font-size="${Math.max(20, spec.width * 0.025)}">Demo preview for ${spec.name}</text>
      <text x="${spec.width * 0.1}" y="${spec.height * 0.62}" fill="rgba(255,255,255,0.72)" font-family="Arial, sans-serif" font-size="${Math.max(16, spec.width * 0.018)}">Add OPENAI_API_KEY to generate real images.</text>
    </svg>`;
  const base64 = Buffer.from(svg).toString("base64");

  return {
    imageBase64: base64,
    imageUrl: `data:image/svg+xml;base64,${base64}`,
  };
}
