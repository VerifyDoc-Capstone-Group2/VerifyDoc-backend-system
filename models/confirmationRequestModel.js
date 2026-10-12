import mongoose from "mongoose";

const confirmationRequestSchema = new mongoose.Schema({
  share: { type: mongoose.Schema.Types.ObjectId, ref: "CredentialShare", required: true, index: true },
  credential: { type: mongoose.Schema.Types.ObjectId, ref: "Credential", required: true, index: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
  status: { type: String, enum: ["Pending", "Confirmed", "Disputed"], default: "Pending", required: true },
  responseNote: { type: String, trim: true, maxlength: 1000 },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  respondedAt: Date
}, { timestamps: true });

confirmationRequestSchema.index({ institution: 1, status: 1, createdAt: -1 });
confirmationRequestSchema.index({ organization: 1, createdAt: -1 });
confirmationRequestSchema.index({ share: 1, status: 1 });

export const ConfirmationRequest = mongoose.model("ConfirmationRequest", confirmationRequestSchema);
