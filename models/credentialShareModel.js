import mongoose from "mongoose";

const credentialShareSchema = new mongoose.Schema({
  credential: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Credential",
    required: true,
    index: true
  },
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 500
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ["Active", "Revoked"],
    default: "Active",
    required: true
  },
  revokedAt: {
    type: Date
  }
}, { timestamps: true });

// Effective access is calculated at read time: an Active share is not
// sufficient if it has expired, the credential was revoked, or the
// receiving Organization is no longer approved.
credentialShareSchema.index({ organization: 1, status: 1, expiresAt: 1 });
credentialShareSchema.index({ citizen: 1, createdAt: -1 });

export const CredentialShare = mongoose.model("CredentialShare", credentialShareSchema);
