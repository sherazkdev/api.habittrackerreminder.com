import mongoose from "mongoose";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
  // eslint-disable-next-line no-var
  var mongooseIndexes: Promise<void> | null | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };
global.mongooseConn = cached;

async function ensureIndexes() {
  if (global.mongooseIndexes) return global.mongooseIndexes;
  global.mongooseIndexes = (async () => {
    const [
      { User },
      { Reminder },
      { NotificationDelivery },
      { Admin },
      { ApiKey },
      { RefreshSession },
    ] = await Promise.all([
      import("@/models/User"),
      import("@/models/Reminder"),
      import("@/models/NotificationDelivery"),
      import("@/models/Admin"),
      import("@/models/ApiKey"),
      import("@/models/RefreshSession"),
    ]);
    await Promise.all([
      User.syncIndexes(),
      Reminder.syncIndexes(),
      NotificationDelivery.syncIndexes(),
      Admin.syncIndexes(),
      ApiKey.syncIndexes(),
      RefreshSession.syncIndexes(),
    ]);
  })().catch(() => {
    global.mongooseIndexes = null;
  });
  return global.mongooseIndexes;
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.mongodbUri(), {
        bufferCommands: false,
        autoIndex: true,
        serverSelectionTimeoutMS: 5_000,
        maxPoolSize: 8,
      })
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }
  try {
    cached.conn = await cached.promise;
    void ensureIndexes();
    return cached.conn;
  } catch (error) {
    cached.conn = null;
    cached.promise = null;
    throw error;
  }
}
