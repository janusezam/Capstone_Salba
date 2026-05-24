const mongoose = require("mongoose");

const userFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderName: { type: String, required: true, trim: true },
    senderEmail: { type: String, default: "", trim: true },
    senderPhone: { type: String, default: "", trim: true },
    category: {
      type: String,
      enum: ["general", "bug", "suggestion", "complaint"],
      default: "general",
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isReadByAdmin: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "feedbacks" }
);

userFeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UserFeedback", userFeedbackSchema);
