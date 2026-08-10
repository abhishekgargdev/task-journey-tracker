import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoryStage extends Document {
  story: mongoose.Types.ObjectId;
  stage: mongoose.Types.ObjectId;
  order: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  githubRepo?: string;
  branchName?: string;
  prLink?: string;
  assignedTo?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StoryStageSchema = new Schema<IStoryStage>(
  {
    story: { type: Schema.Types.ObjectId, ref: "UserStory", required: true },
    stage: { type: Schema.Types.ObjectId, ref: "StageDefinition", required: true },
    order: { type: Number, required: true },
    plannedStartDate: { type: Date },
    plannedEndDate: { type: Date },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "blocked", "on_hold", "completed"],
      default: "not_started",
    },
    githubRepo: { type: String },
    branchName: { type: String },
    prLink: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

// Compound unique index so a user story can't have duplicate stages
StoryStageSchema.index({ story: 1, stage: 1 }, { unique: true });

export const StoryStage: Model<IStoryStage> =
  mongoose.models.StoryStage || mongoose.model<IStoryStage>("StoryStage", StoryStageSchema);
export default StoryStage;
