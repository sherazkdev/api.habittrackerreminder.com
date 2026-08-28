import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { Admin } from "@/models/Admin";
import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validateNewPassword } from "@/lib/auth/password-policy";
import { verifyApiKey } from "@/lib/auth/api-keys";
import {
  createRefreshSession,
  revokeAllRefreshSessions,
  revokeRefreshSession,
  rotateRefreshSession,
} from "@/lib/auth/refresh-sessions";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";

export type AdminProfile = { id: string; name: string; email: string };

function toProfile(admin: { _id: { toString(): string }; name: string; email: string }): AdminProfile {
  return { id: admin._id.toString(), name: admin.name, email: admin.email };
}

export async function ensureAdminSeed() {
  if (!env.adminSeedEnabled()) return;
  await connectDB();
  const existing = await Admin.findOne({ email: env.adminSeedEmail().toLowerCase() });
  if (existing) return;
  await Admin.create({
    name: env.adminSeedName(),
    email: env.adminSeedEmail().toLowerCase(),
    passwordHash: await hashPassword(env.adminSeedPassword()),
    tokenVersion: 0,
    isActive: true,
  });
}

export async function loginAdmin(email: string, password: string) {
  await connectDB();
  const admin = await Admin.findOne({ email: email.toLowerCase().trim(), isActive: true });
  if (!admin) return null;
  const valid = await verifyPassword(admin.passwordHash, password);
  if (!valid) return null;
  const adminId = admin._id.toString();
  const access = await signAccessToken(adminId, admin.tokenVersion);
  const refresh = await createRefreshSession(adminId, admin.tokenVersion);
  return {
    accessToken: access.token,
    expiresIn: access.expiresIn,
    tokenType: "Bearer" as const,
    admin: toProfile(admin),
    sessionId: refresh.sessionId,
    refreshToken: refresh.refreshToken,
  };
}

export async function refreshAdminSession(refreshCookieValue: string | undefined) {
  const { decodeRefreshCookieValue } = await import("@/lib/auth/refresh-sessions");
  const decoded = decodeRefreshCookieValue(refreshCookieValue);
  if (!decoded) return null;
  await connectDB();
  const rotated = await rotateRefreshSession(decoded.sessionId, decoded.refreshToken);
  if (!rotated) return null;
  const admin = await Admin.findById(rotated.adminId);
  if (!admin || !admin.isActive || admin.tokenVersion !== rotated.tokenVersion) {
    await revokeRefreshSession(rotated.sessionId);
    return null;
  }
  const access = await signAccessToken(admin._id.toString(), admin.tokenVersion);
  return {
    accessToken: access.token,
    expiresIn: access.expiresIn,
    tokenType: "Bearer" as const,
    admin: toProfile(admin),
    sessionId: rotated.sessionId,
    refreshToken: rotated.refreshToken,
  };
}

export async function logoutAdmin(refreshCookieValue: string | undefined) {
  const { decodeRefreshCookieValue } = await import("@/lib/auth/refresh-sessions");
  const decoded = decodeRefreshCookieValue(refreshCookieValue);
  if (!decoded) return;
  await revokeRefreshSession(decoded.sessionId);
}

export async function verifyBearerAdmin(token: string) {
  const verified = await verifyAccessToken(token);
  if (!verified) return null;
  await connectDB();
  const admin = await Admin.findById(verified.adminId);
  if (!admin || !admin.isActive || admin.tokenVersion !== verified.tokenVersion) return null;
  return admin;
}

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  const policy = validateNewPassword(newPassword, confirmPassword, currentPassword);
  if (!policy.ok) {
    return { ok: false as const, code: policy.code, message: policy.message };
  }
  await connectDB();
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return { ok: false as const, code: "UNAUTHORIZED", message: "Authentication required" };
  }
  const valid = await verifyPassword(admin.passwordHash, currentPassword);
  if (!valid) {
    return { ok: false as const, code: "INVALID_CREDENTIALS", message: "Current password is incorrect" };
  }
  admin.passwordHash = await hashPassword(newPassword);
  admin.tokenVersion += 1;
  await admin.save();
  await revokeAllRefreshSessions(admin._id.toString());
  return { ok: true as const };
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function requireAdmin(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyBearerAdmin(token);
}

export async function requireAdminOrApiKey(request: NextRequest) {
  const bearerAdmin = await requireAdmin(request);
  if (bearerAdmin) return bearerAdmin;
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) return null;
  return verifyApiKey(apiKey);
}

export function getCronSecret(request: NextRequest): string | null {
  const header = request.headers.get("x-cron-secret")?.trim();
  if (header) return header;
  return getBearerToken(request);
}

export function requireCron(request: NextRequest): boolean {
  const secret = env.cronSecret();
  if (!secret) return false;
  return getCronSecret(request) === secret;
}

export function setRefreshCookie(response: NextResponse, value: string) {
  response.cookies.set(env.refreshCookieName(), value, {
    httpOnly: true,
    secure: env.cookieSecure(),
    sameSite: env.cookieSameSite(),
    path: "/",
    maxAge: refreshTtlSeconds(),
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(env.refreshCookieName(), "", {
    httpOnly: true,
    secure: env.cookieSecure(),
    sameSite: env.cookieSameSite(),
    path: "/",
    maxAge: 0,
  });
}

export async function readRefreshCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(env.refreshCookieName())?.value;
}

import { refreshTtlSeconds } from "@/lib/auth/jwt";
