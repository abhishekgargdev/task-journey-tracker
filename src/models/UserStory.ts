import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStagePlanEntry {
  stage: mongoose.Types.ObjectId;
  order: number;
}

export interface IStoryHoldHistory {
  reason: string;
  heldAt: Date;
  resumedAt?: Date;
  heldBy: mongoose.Types.ObjectId;
}

export interface IUserStory extends Document {
  title: string;
  description?: string;
  adoStoryLink?: string;
  task: mongoose.Types.ObjectId;
  sprint: mongoose.Types.ObjectId;
  stagePlan: IStagePlanEntry[];
  currentStageOrder: number;
  overallStatus: "not_started" | "in_progress" | "blocked" | "on_hold" | "completed";
  assignedTo?: mongoose.Types.ObjectId;
  state: "New" | "Active" | "Resolved" | "Closed";
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  isOnHold: boolean;
  holdReason?: string;
  holdHistory: IStoryHoldHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const StagePlanEntrySchema = new Schema<IStagePlanEntry>({
  stage: { type: Schema.Types.ObjectId, ref: "StageDefinition", required: true },
  order: { type: Number, required: true },
});

const StoryHoldHistorySchema = new Schema<IStoryHoldHistory>({
  reason: { type: String, required: true },
  heldAt: { type: Date, required: true, default: Date.now },
  resumedAt: { type: Date },
  heldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const UserStorySchema = new Schema<IUserStory>(
  {
    title: { type: String, required: true },
    description: { type: String },
    adoStoryLink: { type: String },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    sprint: { type: Schema.Types.ObjectId, ref: "Sprint", required: true, index: true },
    stagePlan: {
      type: [StagePlanEntrySchema],
      required: true,
      validate: {
        validator: function (val: IStagePlanEntry[]) {
          return val && val.length >= 1;
        },
        message: "stagePlan must have at least one stage entry.",
      },
    },
    currentStageOrder: { type: Number, default: 1 },
    overallStatus: {
      type: String,
      enum: ["not_started", "in_progress", "blocked", "on_hold", "completed"],
      default: "not_started",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    state: {
      type: String,
      enum: ["New", "Active", "Resolved", "Closed"],
      default: "New",
      index: true,
    },
    plannedStartDate: { type: Date },
    plannedEndDate: { type: Date },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },
    isOnHold: { type: Boolean, default: false },
    holdReason: { type: String },
    holdHistory: [StoryHoldHistorySchema],
  },
  { timestamps: true }
);

export const UserStory: Model<IUserStory> =
  mongoose.models.UserStory || mongoose.model<IUserStory>("UserStory", UserStorySchema);
export default UserStory;
