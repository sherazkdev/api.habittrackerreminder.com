import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fcmTokens: [{ type: String }],
  },
  { timestamps: true },
);

export const User = models.User ?? model("User", UserSchema);
