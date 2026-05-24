import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  currentMission: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  color: { type: String, default: '#EF4444' },
}, { timestamps: true });

export default mongoose.model("Team", teamSchema);
