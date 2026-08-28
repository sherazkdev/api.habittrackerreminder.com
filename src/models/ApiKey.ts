import { Schema, model, models } from "mongoose";

const ApiKeySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    prefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, unique: true },
    adminId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ApiKey = models.ApiKey ?? model("ApiKey", ApiKeySchema);
