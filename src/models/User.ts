import { Schema, model, models } from "mongoose";

const DeviceMetaSchema = new Schema(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ["android", "ios"] },
    lastSeenAt: { type: Date },
    createdAt: { type: Date },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fcmTokens: [{ type: String }],
    deviceMeta: [DeviceMetaSchema],
    /** IANA timezone from the phone (e.g. America/New_York). Used when a reminder omits timezone. */
    timezone: { type: String },
    /** Stable per-app-install id from the client. Keeps userId across FCM token rotation/reinstall when sent. */
    installationId: { type: String },
  },
  { timestamps: true },
);

UserSchema.index({ installationId: 1 }, { unique: true, sparse: true });

export const User = models.User ?? model("User", UserSchema);
