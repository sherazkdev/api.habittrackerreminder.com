import { API_BASE_URL } from "@/lib/api-config";

export function mediaUrl(image: string | null | undefined): string | null {
  const value = image?.trim();
  if (!value) return null;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return value;
}

export function isValidMediaUrl(image: string): boolean {
  if (image.startsWith("/uploads/") || image.startsWith("/assets/")) return true;
  try {
    const parsed = new URL(image);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
