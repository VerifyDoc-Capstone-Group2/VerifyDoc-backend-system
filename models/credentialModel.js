import mongoose from "mongoose";

const credentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution"
    },

    issuerName: {
      type: String,
      trim: true,
      required: true
    },

    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    credentialType: {
      type: String,
      required: true,
      trim: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    fieldOfStudy: {
      type: String,
      trim: true
    },

    issueDate: {
      type: Date,
      required: true
    },

    graduationYear: {
      type: Number
    },

    document: {
      url: {
        type: String,
        required: true
      },

      publicId: {
        type: String,
        required: true
      }
    },

    source: {
      type: String,
      enum: ["Institution", "Citizen"],
      required: true
    },

    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: function () {
        return this.source === "Institution" ? "Verified" : "Pending";
      }
    },

    status: {
      type: String,
      enum: ["Active", "Revoked"],
      default: "Active"
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    verifiedByInstitutionUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    verifiedAt: {
      type: Date
    },

    revokedAt: {
      type: Date
    },

    revocationReason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Credential = mongoose.model(
  "Credential",
  credentialSchema
);