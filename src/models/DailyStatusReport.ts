import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILinkedTask {
  taskId: mongoose.Types.ObjectId;
  taskType: "KanbanTask" | "AdhocTask" | "UserStory";
  title: string;
}

export interface IDailyStatusReport extends Document {
  owner: mongoose.Types.ObjectId;
  date: Date; // Midnight local time
  completedWork: string;
  plannedWork?: string;
  blockers?: string;
  hoursSpent?: number;
  mood: "productive" | "average" | "blocked" | "exhausted";
  linkedTasks: ILinkedTask[];
  createdAt: Date;
  updatedAt: Date;
}

const LinkedTaskSchema = new Schema<ILinkedTask>({
  taskId: { type: Schema.Types.ObjectId, required: true },
  taskType: { type: String, enum: ["KanbanTask", "AdhocTask", "UserStory"], required: true },
  title: { type: String, required: true },
});

const DailyStatusReportSchema = new Schema<IDailyStatusReport>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    completedWork: { type: String, required: true },
    plannedWork: { type: String, default: "" },
    blockers: { type: String, default: "" },
    hoursSpent: { type: Number, default: 0 },
    mood: {
      type: String,
      enum: ["productive", "average", "blocked", "exhausted"],
      default: "average",
    },
    linkedTasks: { type: [LinkedTaskSchema], default: [] },
  },
  { timestamps: true }
);

// Enforce unique report per user per calendar day
DailyStatusReportSchema.index({ owner: 1, date: 1 }, { unique: true });

export const DailyStatusReport: Model<IDailyStatusReport> =
  mongoose.models.DailyStatusReport ||
  mongoose.model<IDailyStatusReport>("DailyStatusReport", DailyStatusReportSchema);

export default DailyStatusReport;
