const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120_000);

type OpenAIRequestResult = {
  ok: boolean;
  status: number;
  statusText: string;
  bodyPreview?: string;
  error?: string;
};

export async function runOpenAIModelsCheck() {
  return openAIRequest("https://api.openai.com/v1/models/gpt-image-1");
}

export async function runOpenAIImageCheck() {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      openaiApiKeyConfigured: false,
      error: "OPENAI_API_KEY is not configured.",
    };
  }

  const imageCheck = await openAIRequest("https://api.openai.com/v1/images/generations", {
    method: "POST",
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt: "Create a simple clean abstract marketing background with no text.",
      size: "1024x1024",
      quality: process.env.OPENAI_IMAGE_QUALITY || "low",
      output_format: process.env.OPENAI_IMAGE_FORMAT || "jpeg",
      output_compression: Number(process.env.OPENAI_IMAGE_COMPRESSION || 80),
      n: 1,
    }),
  });

  return {
    ok: imageCheck.ok,
    openaiApiKeyConfigured: true,
    imageCheck: summarizeImageCheck(imageCheck),
  };
}

export function summarizeImageCheck(imageCheck: OpenAIRequestResult) {
  return {
    ok: imageCheck.ok,
    status: imageCheck.status,
    statusText: imageCheck.statusText,
    error: imageCheck.error,
    bodyPreview: imageCheck.bodyPreview,
    receivedImage: Boolean(imageCheck.bodyPreview?.includes("b64_json")),
  };
}

async function openAIRequest(endpoint: string, init: RequestInit = {}): Promise<OpenAIRequestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });
    const body = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: redact(body.slice(0, 700)),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "request failed",
      error: describeError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  return `${error.name}: ${error.message}${error.cause ? ` | cause: ${JSON.stringify(error.cause)}` : ""}`;
}

function redact(value: string) {
  return value.replace(/sk-[A-Za-z0-9_-]+/g, "sk-redacted");
}
