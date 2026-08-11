import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoryStage extends Document {
  storyId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  stageOrder: number;
  taskName: string;
  description?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  developBy?: mongoose.Types.ObjectId;
  githubPrLink?: string;
  branchName?: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  isArchived: boolean;
  githubRepo?: string; // Preserve for UI integration
  prStatus?: "none" | "pending" | "merged"; // Preserve for UI integration
  notes?: string; // Preserve for UI integration
  implementationDescription?: string; // Preserve for UI integration
  adoStoryLink?: string; // Preserve for UI integration
  createdAt: Date;
  updatedAt: Date;
}

const StoryStageSchema = new Schema<IStoryStage>(
  {
    storyId: { type: Schema.Types.ObjectId, ref: "Story", required: true },
    stageId: { type: Schema.Types.ObjectId, ref: "StageDefinition", required: true },
    stageOrder: { type: Number, required: true },
    taskName: { type: String, required: true },
    description: { type: String },
    plannedStartDate: { type: Date },
    plannedEndDate: { type: Date },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },
    developBy: { type: Schema.Types.ObjectId, ref: "User" },
    githubPrLink: { type: String },
    branchName: { type: String },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "blocked", "completed", "delayed"],
      default: "not_started",
      index: true,
    },
    isArchived: { type: Boolean, default: false, index: true },
    githubRepo: { type: String },
    prStatus: {
      type: String,
      enum: ["none", "pending", "merged"],
      default: "none",
    },
    notes: { type: String },
    implementationDescription: { type: String },
    adoStoryLink: { type: String },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate child stories for the same Story + Stage combination
StoryStageSchema.index({ storyId: 1, stageId: 1 }, { unique: true });

export const StoryStage: Model<IStoryStage> =
  mongoose.models.StoryStage || mongoose.model<IStoryStage>("StoryStage", StoryStageSchema);
export default StoryStage;
