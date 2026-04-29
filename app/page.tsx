"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Moon,
  RefreshCcw,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ALL_PLATFORMS, type PlatformKey } from "@/lib/platforms";
import type { CompanyMemory, ContentType, GeneratedImage, Tone } from "@/lib/types";

type ImageState = Partial<Record<PlatformKey, GeneratedImage>>;
type StatusState = Partial<Record<PlatformKey, "idle" | "loading" | "generated" | "error">>;

const tones: Tone[] = ["Luxury", "Corporate", "Friendly", "Bold", "Minimal"];
const contentTypes: ContentType[] = ["Upcoming Event", "Regular Marketing Content"];

const emptyMemory: CompanyMemory = {
  previousCampaigns: [],
  approvedStyles: [],
  rejectedStyles: [],
  userFeedback: [],
};

const initialForm = {
  companyName: "",
  industry: "",
  contentType: "Upcoming Event" as ContentType,
  eventName: "",
  tone: "Luxury" as Tone,
  brandColors: "",
  extraInstructions: "",
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>(
    ALL_PLATFORMS.map((platform) => platform.key),
  );
  const [images, setImages] = useState<ImageState>({});
  const [statuses, setStatuses] = useState<StatusState>({});
  const [profile, setProfile] = useState<CompanyMemory>(emptyMemory);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedImage | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [feedback, setFeedback] = useState<Partial<Record<PlatformKey, string>>>({});

  const completedCount = selectedPlatforms.filter((platform) => statuses[platform] === "generated").length;
  const progress = selectedPlatforms.length ? Math.round((completedCount / selectedPlatforms.length) * 100) : 0;

  const currentLogoUrl = useMemo(() => logoPreview || profile.logoUrl || "", [logoPreview, profile.logoUrl]);

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => response.json())
      .then(({ profile: savedProfile }) => {
        const merged = { ...emptyMemory, ...savedProfile };
        setProfile(merged);
        setForm((current) => ({
          ...current,
          companyName: merged.companyName || "",
          industry: merged.industry || "",
          brandColors: merged.brandColors || "",
          tone: (merged.preferredTone as Tone) || "Luxury",
        }));
      })
      .catch(() => setError("Could not load saved company memory."));

    const savedHistory = window.localStorage.getItem("ai-social-image-history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ai-social-image-history", JSON.stringify(history.slice(0, 12)));
  }, [history]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  }

  function togglePlatform(platform: PlatformKey) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsGenerating(true);
    setImages({});
    setStatuses(Object.fromEntries(selectedPlatforms.map((platform) => [platform, "loading"])));

    const failedPlatforms: string[] = [];

    try {
      for (const platform of selectedPlatforms) {
        const formData = buildFormData([platform]);
        const response = await fetch("/api/generate", { method: "POST", body: formData });
        const payload = await response.json();

        if (!response.ok) {
          failedPlatforms.push(platform);
          setStatuses((current) => ({ ...current, [platform]: "error" }));
          setError(payload.error || "One platform failed. The remaining platforms will continue.");
          continue;
        }

        const image = payload.images?.[0] as GeneratedImage | undefined;
        if (image) {
          setImages((current) => ({ ...current, [image.platform]: image }));
          setStatuses((current) => ({ ...current, [image.platform]: "generated" }));
        }
        if (payload.profile) setProfile(payload.profile);
      }

      setHistory((current) => [
        `${form.eventName || "Untitled campaign"} - ${new Date().toLocaleString()}`,
        ...current,
      ].slice(0, 12));

      if (failedPlatforms.length) {
        setError(
          `${failedPlatforms.length} platform request${failedPlatforms.length === 1 ? "" : "s"} failed. Check /api/openai-check on your Railway URL, then /api/openai-check?image=1.`,
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setStatuses(Object.fromEntries(selectedPlatforms.map((platform) => [platform, "error"])));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRegenerate(platform: PlatformKey) {
    const current = images[platform];
    if (!current) return;

    setError("");
    setStatuses((existing) => ({ ...existing, [platform]: "loading" }));

    try {
      const response = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          previousPrompt: current.prompt,
          userFeedback: feedback[platform] || "",
        }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error || "Regeneration failed.");

      setImages((existing) => ({ ...existing, [platform]: payload.image }));
      setStatuses((existing) => ({ ...existing, [platform]: "generated" }));
      setFeedback((existing) => ({ ...existing, [platform]: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not regenerate this image.");
      setStatuses((existing) => ({ ...existing, [platform]: "error" }));
    }
  }

  async function clearMemory() {
    await fetch("/api/profile", { method: "DELETE" });
    setProfile(emptyMemory);
    setLogoFile(null);
    setLogoPreview("");
    setForm(initialForm);
  }

  function buildFormData(platforms = selectedPlatforms) {
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    formData.append("selectedPlatforms", JSON.stringify(platforms));
    formData.append("companyMemory", JSON.stringify(profile));
    if (logoFile) formData.append("logoFile", logoFile);
    return formData;
  }

  const shellClass = darkMode
    ? "min-h-screen bg-ink text-white"
    : "min-h-screen bg-mist text-ink";

  return (
    <main className={shellClass}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <aside className={`hidden w-72 shrink-0 rounded-lg border p-4 lg:block ${darkMode ? "border-white/10 bg-white/[0.04]" : "border-line bg-white"}`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent">Studio Memory</p>
              <h2 className="mt-1 text-lg font-semibold">Session History</h2>
            </div>
            <Sparkles className="h-5 w-5 text-gold" />
          </div>
          <div className="space-y-2">
            {history.length ? (
              history.map((item) => (
                <div key={item} className={`rounded-md border px-3 py-2 text-sm ${darkMode ? "border-white/10 bg-white/[0.04] text-white/80" : "border-line bg-mist text-ink/75"}`}>
                  {item}
                </div>
              ))
            ) : (
              <p className={darkMode ? "text-sm text-white/55" : "text-sm text-ink/55"}>No campaigns yet.</p>
            )}
          </div>
          <div className={`mt-6 rounded-md border p-3 text-sm ${darkMode ? "border-white/10 bg-black/10 text-white/70" : "border-line bg-mist text-ink/70"}`}>
            <p className="font-medium text-current">{profile.companyName || "No saved company"}</p>
            <p>{profile.industry || "Industry not saved"}</p>
            <p>{profile.preferredTone || "Tone not saved"}</p>
          </div>
          <button
            type="button"
            onClick={clearMemory}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${darkMode ? "border-white/10 hover:bg-white/10" : "border-line hover:bg-ink/5"}`}
          >
            <Trash2 className="h-4 w-4" />
            Clear Company Memory
          </button>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-5">
          <header className={`rounded-lg border p-4 shadow-soft sm:p-5 ${darkMode ? "border-white/10 bg-white/[0.06]" : "border-line bg-white"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">AI Social Image Studio</p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Generate branded social assets</h1>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode((value) => !value)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition ${darkMode ? "border-white/10 bg-white/10" : "border-line bg-mist"}`}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>

            <form onSubmit={handleGenerate} className="mt-5 space-y-4">
              <div className={`rounded-lg border p-3 ${darkMode ? "border-white/10 bg-black/15" : "border-line bg-mist"}`}>
                <label className="mb-2 block text-sm font-medium" htmlFor="extraInstructions">
                  Creative brief
                </label>
                <div className="flex gap-3">
                  <textarea
                    id="extraInstructions"
                    value={form.extraInstructions}
                    onChange={(event) => updateField("extraInstructions", event.target.value)}
                    rows={3}
                    className={inputClass(darkMode, "min-h-24 flex-1 resize-none")}
                    placeholder="Describe the campaign visuals, required wording, offer, audience, or visual direction."
                  />
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex w-14 shrink-0 items-center justify-center rounded-md bg-accent text-white transition hover:bg-accent/90 disabled:opacity-60"
                    aria-label="Generate images"
                    title="Generate images"
                  >
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Company Name">
                  <input className={inputClass(darkMode)} value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
                </Field>
                <Field label="Company Industry">
                  <input className={inputClass(darkMode)} value={form.industry} onChange={(event) => updateField("industry", event.target.value)} />
                </Field>
                <Field label="Content Type">
                  <select className={inputClass(darkMode)} value={form.contentType} onChange={(event) => updateField("contentType", event.target.value)}>
                    {contentTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Event Name / Campaign Topic">
                  <input className={inputClass(darkMode)} value={form.eventName} onChange={(event) => updateField("eventName", event.target.value)} />
                </Field>
                <Field label="Preferred Tone">
                  <select className={inputClass(darkMode)} value={form.tone} onChange={(event) => updateField("tone", event.target.value)}>
                    {tones.map((tone) => <option key={tone}>{tone}</option>)}
                  </select>
                </Field>
                <Field label="Brand Colors">
                  <input className={inputClass(darkMode)} value={form.brandColors} onChange={(event) => updateField("brandColors", event.target.value)} placeholder="#10141f, emerald, gold" />
                </Field>
                <Field label="Upload Logo">
                  <label className={`flex h-11 cursor-pointer items-center justify-between rounded-md border px-3 text-sm transition ${darkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-line bg-white hover:bg-mist"}`}>
                    <span className="truncate">{logoFile?.name || (profile.logoUrl ? "Saved logo loaded" : "PNG, JPG, SVG")}</span>
                    <Upload className="h-4 w-4 shrink-0" />
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" onChange={handleLogoChange} />
                  </label>
                </Field>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-coral px-4 font-semibold text-white transition hover:bg-coral/90 disabled:opacity-60"
                  >
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                    Generate Images
                  </button>
                </div>
              </div>
            </form>

            {selectedPlatforms.length > 0 && (
              <div className="mt-4">
                <div className={`h-2 overflow-hidden rounded-full ${darkMode ? "bg-white/10" : "bg-ink/10"}`}>
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {error && <p className="mt-3 rounded-md bg-coral/15 px-3 py-2 text-sm text-coral">{error}</p>}
          </header>

          <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            {ALL_PLATFORMS.map((platform) => {
              const image = images[platform.key];
              const status = statuses[platform.key] || "idle";
              const isSelected = selectedPlatforms.includes(platform.key);

              return (
                <article key={platform.key} className={`rounded-lg border p-4 ${darkMode ? "border-white/10 bg-white/[0.05]" : "border-line bg-white"}`}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{platform.name}</h2>
                      <p className={darkMode ? "text-sm text-white/60" : "text-sm text-ink/60"}>{platform.size}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePlatform(platform.key)}
                      className={`flex h-8 w-8 items-center justify-center rounded-md border ${isSelected ? "border-accent bg-accent text-white" : darkMode ? "border-white/10" : "border-line"}`}
                      aria-label={`Toggle ${platform.name}`}
                      title={`Toggle ${platform.name}`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border ${darkMode ? "border-white/10 bg-black/20" : "border-line bg-mist"}`}>
                    {status === "loading" && (
                      <div className="flex flex-col items-center gap-2 text-sm">
                        <Loader2 className="h-7 w-7 animate-spin text-accent" />
                        Generating
                      </div>
                    )}
                    {image && status !== "loading" && (
                      <>
                        <img src={image.imageUrl} alt={`${platform.name} generated preview`} className="h-full w-full object-cover" />
                        {currentLogoUrl && <img src={currentLogoUrl} alt="" className="absolute bottom-3 left-3 max-h-10 max-w-[38%] rounded bg-white/90 p-1 shadow" />}
                      </>
                    )}
                    {!image && status !== "loading" && <ImagePlus className={darkMode ? "h-9 w-9 text-white/30" : "h-9 w-9 text-ink/30"} />}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className={statusColor(status)}>{labelForStatus(status)}</span>
                  </div>

                  <textarea
                    value={feedback[platform.key] || ""}
                    onChange={(event) => setFeedback((current) => ({ ...current, [platform.key]: event.target.value }))}
                    className={inputClass(darkMode, "mt-3 min-h-16 resize-none text-sm")}
                    placeholder="Regeneration feedback"
                  />

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <IconButton disabled={!image} onClick={() => image && setPreview(image)} title="Preview">
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <IconButton disabled={!image || status === "loading"} onClick={() => handleRegenerate(platform.key)} title="Regenerate">
                      <RefreshCcw className="h-4 w-4" />
                    </IconButton>
                    <IconButton disabled={!image} onClick={() => image && downloadExactImage(image, currentLogoUrl)} title="Download">
                      <Download className="h-4 w-4" />
                    </IconButton>
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white text-ink shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="font-semibold">{preview.platformName}</h2>
                <p className="text-sm text-ink/60">{preview.size}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-ink/5" aria-label="Close preview" title="Close preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative max-h-[78vh] overflow-auto bg-mist p-4">
              <img src={preview.imageUrl} alt={`${preview.platformName} full preview`} className="mx-auto max-h-[70vh] rounded-md object-contain" />
              {currentLogoUrl && <img src={currentLogoUrl} alt="" className="absolute bottom-8 left-8 max-h-16 max-w-[24%] rounded bg-white/90 p-2 shadow" />}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  children,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-10 items-center justify-center rounded-md border border-line bg-white text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function inputClass(darkMode: boolean, extra = "") {
  return [
    "w-full rounded-md border px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20",
    darkMode ? "border-white/10 bg-white/5 text-white placeholder:text-white/35" : "border-line bg-white text-ink placeholder:text-ink/35",
    extra,
  ].join(" ");
}

function labelForStatus(status: string) {
  if (status === "loading") return "Generating";
  if (status === "generated") return "Ready";
  if (status === "error") return "Needs attention";
  return "Waiting";
}

function statusColor(status: string) {
  if (status === "generated") return "text-accent";
  if (status === "error") return "text-coral";
  if (status === "loading") return "text-gold";
  return "text-current opacity-55";
}

async function downloadExactImage(image: GeneratedImage, logoUrl?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return;

  const generated = await loadImage(image.imageUrl);
  coverDraw(context, generated, canvas.width, canvas.height);

  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      const maxLogoWidth = canvas.width * 0.22;
      const maxLogoHeight = canvas.height * 0.12;
      const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height, 1);
      const width = logo.width * scale;
      const height = logo.height * scale;
      const padding = Math.max(18, canvas.width * 0.025);
      context.fillStyle = "rgba(255,255,255,0.9)";
      roundRect(context, padding - 8, canvas.height - height - padding - 8, width + 16, height + 16, 10);
      context.fill();
      context.drawImage(logo, padding, canvas.height - height - padding, width, height);
    } catch {
      // Download still succeeds if a remote logo cannot be composited by the browser.
    }
  }

  const link = document.createElement("a");
  link.download = `${image.platformName.toLowerCase()}-${image.width}x${image.height}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function coverDraw(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;
  context.drawImage(image, x, y, scaledWidth, scaledHeight);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
