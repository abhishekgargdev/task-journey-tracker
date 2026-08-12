import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKanbanTask extends Document {
  title: string;
  description?: string;
  columnId: mongoose.Types.ObjectId;
  order: number;
  owner: mongoose.Types.ObjectId;
  date: Date; // The day this task is planned for (midnight UTC)
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const KanbanTaskSchema = new Schema<IKanbanTask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    columnId: { type: Schema.Types.ObjectId, ref: "KanbanColumn", required: true, index: true },
    order: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const KanbanTask: Model<IKanbanTask> =
  mongoose.models.KanbanTask || mongoose.model<IKanbanTask>("KanbanTask", KanbanTaskSchema);
export default KanbanTask;
