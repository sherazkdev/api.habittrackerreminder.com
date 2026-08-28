import { createHash, randomBytes, randomUUID } from "node:crypto";
import { RefreshSession } from "@/models/RefreshSession";
import { refreshTtlSeconds } from "@/lib/auth/jwt";

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encodeRefreshCookieValue(sessionId: string, refreshToken: string): string {
  return `${sessionId}.${refreshToken}`;
}

export function decodeRefreshCookieValue(value: string | undefined) {
  if (!value) return null;
  const separator = value.indexOf(".");
  if (separator <= 0 || separator >= value.length - 1) return null;
  const sessionId = value.slice(0, separator);
  const refreshToken = value.slice(separator + 1);
  if (!sessionId || !refreshToken) return null;
  return { sessionId, refreshToken };
}

export async function createRefreshSession(adminId: string, tokenVersion: number) {
  const sessionId = randomUUID();
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);
  await RefreshSession.create({
    sessionId,
    adminId,
    tokenVersion,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  });
  return { sessionId, refreshToken };
}

export async function rotateRefreshSession(sessionId: string, refreshToken: string) {
  const doc = await RefreshSession.findOne({ sessionId });
  if (!doc || doc.expiresAt < new Date()) {
    if (doc) await RefreshSession.deleteOne({ sessionId });
    return null;
  }
  if (doc.refreshTokenHash !== hashRefreshToken(refreshToken)) return null;
  await RefreshSession.deleteOne({ sessionId });
  return createRefreshSession(doc.adminId, doc.tokenVersion).then((next) => ({
    ...next,
    adminId: doc.adminId,
    tokenVersion: doc.tokenVersion,
  }));
}

export async function revokeRefreshSession(sessionId: string) {
  await RefreshSession.deleteOne({ sessionId });
}

export async function revokeAllRefreshSessions(adminId: string) {
  await RefreshSession.deleteMany({ adminId });
}
