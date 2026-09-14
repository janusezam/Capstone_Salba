import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number, default: 10 },
  severity: { type: String, enum: ['low', 'moderate', 'critical'], default: 'moderate' },
  note: { type: String, default: "" },
  status: { type: String, enum: ['new', 'assigned', 'Resolved'], default: 'new' },
  geofenceRadiusMeters: { type: Number, default: 100 },
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  disasterType: { type: String, default: "" },
  locationName: { type: String, default: "" },
  clientRequestId: { type: String, unique: true, sparse: true },
  senderName: { type: String, default: "" },
  senderPhone: { type: String, default: "" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedByName: { type: String, default: "" },
  resolvedAt: { type: Date },
  photoUrl: { type: String, default: null },
}, { timestamps: true });

reportSchema.index({ lat: 1, lng: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ assignedTeam: 1, status: 1 });
reportSchema.index({ senderPhone: 1, createdAt: -1 });
reportSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
