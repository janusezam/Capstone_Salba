import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderName: { type: String, required: true, trim: true },
    senderPhone: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    category: {
      type: String,
      enum: ["general", "bug", "suggestion", "complaint", "other"],
      default: "general",
    },
    isReadByAdmin: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

feedbackSchema.index({ createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
