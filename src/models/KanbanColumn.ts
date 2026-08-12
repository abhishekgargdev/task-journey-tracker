import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKanbanColumn extends Document {
  name: string;
  color: string;
  order: number;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const KanbanColumnSchema = new Schema<IKanbanColumn>(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "slate" },
    order: { type: Number, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export const KanbanColumn: Model<IKanbanColumn> =
  mongoose.models.KanbanColumn || mongoose.model<IKanbanColumn>("KanbanColumn", KanbanColumnSchema);
export default KanbanColumn;
