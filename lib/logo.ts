import { promises as fs } from "fs";
import path from "path";

const maxLogoSize = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

export async function saveLogo(file: File | null) {
  if (!file || file.size === 0) return undefined;
  if (!allowedTypes.has(file.type)) {
    throw new Error("Logo must be a PNG, JPG, or SVG file.");
  }
  if (file.size > maxLogoSize) {
    throw new Error("Logo file must be smaller than 4 MB.");
  }

  const extension = extensionForType(file.type);
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `logo-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

function extensionForType(type: string) {
  if (type === "image/svg+xml") return "svg";
  if (type === "image/jpeg") return "jpg";
  return "png";
}
