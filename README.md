# AI Social Image Studio

A modern Next.js app for creating downloadable static marketing images for Facebook, Instagram, TikTok, and LinkedIn with the OpenAI image generation API.

## Features

- Chat-style creative brief plus structured company and campaign fields
- Logo upload for PNG, JPG, and SVG files up to 4 MB
- Platform cards for Facebook, Instagram, TikTok, and LinkedIn
- Generate, preview, regenerate, and download images
- Exact download canvases for:
  - Facebook: 1200 x 630 px
  - Instagram: 1080 x 1080 px
  - TikTok: 1080 x 1920 px
  - LinkedIn: 1200 x 627 px
- Company profile memory saved locally in `data/profile.json`
- Session history saved in browser local storage
- Backend-only OpenAI API key usage, upload validation, rate limiting, and friendly errors

## Install

```bash
npm install
```

## Add Your OpenAI API Key

Create `.env.local`:

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_IMAGE_MODEL=gpt-image-1
```

The API key is only used in Next.js API routes and is never exposed to the browser.

## Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If `OPENAI_API_KEY` is not set, the app returns demo placeholder images so the UI can still be tested.

## How Image Generation Works

The frontend posts a multipart form to `POST /api/generate` with company details, selected platforms, and an optional logo. The API route validates the upload, loads saved company memory, builds a platform-specific professional prompt, and calls OpenAI image generation from the server.

OpenAI image models support a limited set of generation sizes, so the server generates the closest matching aspect ratio. The browser download flow composites the preview and logo onto an exact-size canvas for each platform.

Regeneration uses `POST /api/regenerate` with the previous prompt, target platform, and optional user feedback. The backend adds a fresh creative variation token so repeated outputs do not intentionally reuse the same direction.

## How Memory/Profile Saving Works

Company memory is saved as local JSON at `data/profile.json` through `POST /api/save-profile` and during generation. It stores:

- Company name
- Industry
- Logo URL
- Brand colors
- Preferred tone
- Previous campaign names
- Approved and rejected styles
- User feedback

This is preference memory, not model training. Future prompt building includes a short summary of saved preferences.

Use **Clear Company Memory** in the sidebar or `DELETE /api/profile` to reset saved profile data.

## API Routes

- `POST /api/generate` generates one image per selected platform.
- `POST /api/regenerate` regenerates one selected platform image.
- `POST /api/save-profile` saves company profile and memory fields.
- `GET /api/profile` returns saved company profile memory.
- `DELETE /api/profile` clears company profile memory.

## Deploy

Deploy to Vercel or any Node-compatible Next.js host.

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add `OPENAI_API_KEY` and optional `OPENAI_IMAGE_MODEL` environment variables.
4. Deploy.

For production, replace the local JSON profile store and local logo uploads with Supabase, Firebase, PostgreSQL, or object storage so memory and files persist across deployments.
