import { Schema, model, models } from "mongoose";

const RefreshSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true, index: true },
    tokenVersion: { type: Number, required: true },
    refreshTokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession = models.RefreshSession ?? model("RefreshSession", RefreshSessionSchema);
