import mongoose from "mongoose";
import { apiError, apiOk } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { env, isFirebaseConfigured } from "@/lib/env";

export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db?.admin().ping();
  } catch (error) {
    return apiError(
      "NOT_READY",
      error instanceof Error ? error.message : "MongoDB is unavailable",
      503,
    );
  }

  return apiOk({
    status: "ready",
    mongo: true,
    firebase: isFirebaseConfigured(),
    cron: Boolean(env.cronSecret()),
    checkedAt: new Date().toISOString(),
  });
}
