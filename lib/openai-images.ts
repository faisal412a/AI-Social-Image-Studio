import { PLATFORM_SPECS, type PlatformKey } from "./platforms";

const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const imageQuality = process.env.OPENAI_IMAGE_QUALITY || "low";
const outputFormat = process.env.OPENAI_IMAGE_FORMAT || "jpeg";
const outputCompression = Number(process.env.OPENAI_IMAGE_COMPRESSION || 80);
const requestTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120_000);

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; type?: string; code?: string };
};

export async function generateImageForPlatform(prompt: string, platform: PlatformKey) {
  if (!process.env.OPENAI_API_KEY) {
    return createDemoImage(platform);
  }

  const spec = PLATFORM_SPECS[platform];
  const response = await withImageRetry(() =>
    postImageGeneration({
      model,
      prompt,
      size: spec.generationSize,
      quality: imageQuality,
      n: 1,
      output_format: outputFormat,
      output_compression: outputCompression,
      background: "opaque",
    }),
  );

  const base64 = response.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI did not return image data.");
  }

  const mimeType = outputFormat === "png" ? "image/png" : `image/${outputFormat}`;

  return {
    imageBase64: base64,
    imageUrl: `data:${mimeType};base64,${base64}`,
  };
}

async function postImageGeneration(body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = safeJsonParse<OpenAIImageResponse>(text);

    if (!response.ok) {
      const detail = payload?.error?.message || text || response.statusText;
      const error = new Error(`OpenAI image API error (${response.status}): ${detail}`);
      Object.assign(error, { status: response.status, detail });
      throw error;
    }

    if (!payload) {
      throw new Error("OpenAI returned an unreadable image response.");
    }

    return payload;
  } catch (error) {
    console.error("OpenAI image request failed", describeError(error));
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function withImageRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isTransientOpenAIError(error)) break;
      await wait(1_000 * attempt);
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
    message.includes("aborted") ||
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

  if (message.includes("aborted") || message.includes("timeout")) {
    return new Error("OpenAI image generation timed out. Try one platform at a time or reduce prompt complexity.");
  }

  if (message.includes("connection") || message.includes("fetch failed")) {
    return new Error("The server could not connect to OpenAI. Check Railway networking and try again.");
  }

  if (status === 400) {
    return error;
  }

  if (status === 401) {
    return new Error("OpenAI rejected the API key. Check OPENAI_API_KEY in Railway and redeploy.");
  }

  if (status === 429) {
    return new Error("OpenAI rate limit or quota was reached. Please wait a bit or check billing/usage.");
  }

  return error;
}

function safeJsonParse<T>(text: string) {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return { error };

  return {
    name: error.name,
    message: error.message,
    status: typeof error === "object" && "status" in error ? error.status : undefined,
    cause: error.cause,
  };
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
