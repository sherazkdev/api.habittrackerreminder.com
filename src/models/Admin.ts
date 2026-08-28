import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const AdminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type AdminDoc = InferSchemaType<typeof AdminSchema> & { _id: Types.ObjectId };

export const Admin = models.Admin ?? model("Admin", AdminSchema);
