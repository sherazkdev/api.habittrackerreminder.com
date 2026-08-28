import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

function accessSecret() {
  return new TextEncoder().encode(env.jwtAccessSecret());
}

function parseDurationMs(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return 15 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

export function accessTokenTtlSeconds(): number {
  return Math.floor(parseDurationMs(env.jwtAccessExpiresIn()) / 1000);
}

export async function signAccessToken(adminId: string, tokenVersion: number) {
  const expiresIn = accessTokenTtlSeconds();
  const token = await new SignJWT({ type: "access", ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuer(env.jwtIssuer())
    .setAudience(env.jwtAudience())
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.jwtAccessExpiresIn())
    .sign(accessSecret());
  return { token, expiresIn };
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, accessSecret(), {
      issuer: env.jwtIssuer(),
      audience: env.jwtAudience(),
    });
    if (payload.type !== "access") return null;
    const adminId = payload.sub;
    const tokenVersion = Number(payload.ver);
    if (!adminId || !Number.isInteger(tokenVersion)) return null;
    return { adminId, tokenVersion };
  } catch {
    return null;
  }
}

export function refreshTtlSeconds(): number {
  return Math.floor(parseDurationMs(env.jwtRefreshExpiresIn()) / 1000);
}
