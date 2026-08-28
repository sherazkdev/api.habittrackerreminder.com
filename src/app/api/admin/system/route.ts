import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { connectDB } from "@/lib/db";
import { env, isFirebaseConfigured } from "@/lib/env";

async function timed(fn: () => Promise<void>) {
  const started = performance.now();
  try {
    await fn();
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : "Unavailable",
    };
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const mongo = await timed(async () => {
    await connectDB();
    await mongoose.connection.db?.admin().ping();
  });

  const firebase = {
    ok: isFirebaseConfigured(),
    latencyMs: 0,
    error: isFirebaseConfigured() ? undefined : "Firebase credentials missing",
  };

  const ready = mongo.ok && firebase.ok;

  return apiOk({
    status: ready ? "healthy" : "degraded",
    checkedAt: new Date().toISOString(),
    api: {
      name: env.appName(),
      version: env.appVersion(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      uptimeSeconds: Math.floor(process.uptime()),
      publicUrl: env.publicUrl(),
      adminUrl: env.adminUrl(),
    },
    dependencies: {
      mongo,
      firebase,
    },
    reminders: {
      cronEnabled: Boolean(env.cronSecret()),
    },
    features: {
      fcmEnabled: isFirebaseConfigured(),
    },
  });
}
