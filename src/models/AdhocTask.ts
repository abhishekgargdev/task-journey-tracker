import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment {
  _id?: string;
  text: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IAdhocTask extends Document {
  taskName: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  assignedBy?: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId;
  branchName?: string;
  prLink?: string;
  status: "todo" | "in_progress" | "blocked" | "completed";
  comments: IComment[];
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    text: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AdhocTaskSchema = new Schema<IAdhocTask>(
  {
    taskName: { type: String, required: true, trim: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    branchName: { type: String, trim: true },
    prLink: { type: String, trim: true },
    status: {
      type: String,
      enum: ["todo", "in_progress", "blocked", "completed"],
      default: "todo",
      index: true,
    },
    comments: [CommentSchema],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const AdhocTask: Model<IAdhocTask> =
  mongoose.models.AdhocTask || mongoose.model<IAdhocTask>("AdhocTask", AdhocTaskSchema);
export default AdhocTask;
