import { createHash, randomBytes } from "node:crypto";
import { ApiKey } from "@/models/ApiKey";
import { Admin } from "@/models/Admin";
import { connectDB } from "@/lib/db";

function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKeyToken(): { token: string; prefix: string } {
  const token = `htk_${randomBytes(24).toString("base64url")}`;
  return { token, prefix: token.slice(0, 12) };
}

export async function listApiKeys(adminId: string) {
  await connectDB();
  const items = await ApiKey.find({ adminId }).sort({ createdAt: -1 }).lean();
  return items.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    prefix: doc.prefix,
    isActive: Boolean(doc.isActive) && !doc.revokedAt,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    lastUsedAt: doc.lastUsedAt?.toISOString?.() ?? null,
    revokedAt: doc.revokedAt?.toISOString?.() ?? null,
  }));
}

export async function createApiKey(adminId: string, name: string) {
  await connectDB();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, message: "API key name is required" };
  const { token, prefix } = generateApiKeyToken();
  const doc = await ApiKey.create({
    name: trimmed,
    prefix,
    keyHash: hashApiKey(token),
    adminId,
    isActive: true,
  });
  return {
    ok: true as const,
    key: {
      id: doc._id.toString(),
      name: doc.name,
      prefix: doc.prefix,
      token,
      createdAt: doc.createdAt.toISOString(),
    },
  };
}

export async function revokeApiKey(adminId: string, id: string) {
  await connectDB();
  const doc = await ApiKey.findOne({ _id: id, adminId });
  if (!doc) return false;
  doc.isActive = false;
  doc.revokedAt = new Date();
  await doc.save();
  return true;
}

export async function verifyApiKey(token: string) {
  const value = token.trim();
  if (!value) return null;
  await connectDB();
  const doc = await ApiKey.findOne({ keyHash: hashApiKey(value), isActive: true, revokedAt: null });
  if (!doc) return null;
  const admin = await Admin.findById(doc.adminId);
  if (!admin || !admin.isActive) return null;
  doc.lastUsedAt = new Date();
  void doc.save().catch(() => undefined);
  return admin;
}
