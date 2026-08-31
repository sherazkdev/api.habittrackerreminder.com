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
  },
  { timestamps: true },
);

export const User = models.User ?? model("User", UserSchema);
