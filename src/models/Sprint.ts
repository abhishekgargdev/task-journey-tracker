import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoldHistory {
  reason: string;
  heldAt: Date;
  resumedAt?: Date;
  heldBy: mongoose.Types.ObjectId;
}

export interface ISprint extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "hold" | "completed";
  holdHistory: IHoldHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const HoldHistorySchema = new Schema<IHoldHistory>({
  reason: { type: String, required: true },
  heldAt: { type: Date, required: true, default: Date.now },
  resumedAt: { type: Date },
  heldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const SprintSchema = new Schema<ISprint>(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "hold", "completed"],
      default: "active",
    },
    holdHistory: [HoldHistorySchema],
  },
  { timestamps: true }
);

export const Sprint: Model<ISprint> = mongoose.models.Sprint || mongoose.model<ISprint>("Sprint", SprintSchema);
export default Sprint;
