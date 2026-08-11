import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStory extends Document {
  storyNumber: string;
  taskName: string;
  description?: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "delayed";
  isOnHold: boolean;
  holdReason?: string;
  stageOrder: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    storyNumber: { type: String, required: true, unique: true, index: true },
    taskName: { type: String, required: true, trim: true },
    description: { type: String },
    plannedStartDate: { type: Date, required: true },
    plannedEndDate: { type: Date, required: true },
    actualStartDate: { type: Date },
    actualEndDate: { type: Date },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "blocked", "completed", "delayed"],
      default: "not_started",
      index: true,
    },
    isOnHold: { type: Boolean, default: false },
    holdReason: { type: String },
    stageOrder: {
      type: [{ type: Schema.Types.ObjectId, ref: "StageDefinition" }],
      required: true,
      validate: {
        validator: function (val: mongoose.Types.ObjectId[]) {
          return val && val.length >= 1;
        },
        message: "story must have at least one stage in stageOrder.",
      },
    },
  },
  { timestamps: true }
);

export const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);
export default Story;
