import mongoose from "mongoose";

const passwordResetOtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("PasswordResetOtp", passwordResetOtpSchema);
