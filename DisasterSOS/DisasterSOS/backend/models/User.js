import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String },
  googleId: { type: String },
  avatar: { type: String },
  authProvider: { type: String, enum: ["local", "google"], default: "local" },
  role: { type: String, enum: ["citizen", "admin", "rescuer"], default: "citizen" },
  birthday: { type: Date },
  location: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
