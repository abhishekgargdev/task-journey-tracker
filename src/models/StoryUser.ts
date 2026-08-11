import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoryUser extends Document {
  storyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const StoryUserSchema = new Schema<IStoryUser>(
  {
    storyId: { type: Schema.Types.ObjectId, ref: "Story", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate user associations to the same story
StoryUserSchema.index({ storyId: 1, userId: 1 }, { unique: true });

export const StoryUser: Model<IStoryUser> =
  mongoose.models.StoryUser || mongoose.model<IStoryUser>("StoryUser", StoryUserSchema);
export default StoryUser;
