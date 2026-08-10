import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStageDefinition extends Document {
  name: string;
  key: string;
  description?: string;
  colorTag?: string;
  isActive: boolean;
  defaultOrder?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StageDefinitionSchema = new Schema<IStageDefinition>(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    colorTag: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    defaultOrder: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

StageDefinitionSchema.pre("validate", function (this: any) {
  if (this.name && !this.key) {
    this.key = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

export const StageDefinition: Model<IStageDefinition> =
  mongoose.models.StageDefinition || mongoose.model<IStageDefinition>("StageDefinition", StageDefinitionSchema);
export default StageDefinition;
