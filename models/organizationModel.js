import mongoose, { trusted } from "mongoose";


const organizationSchema = new mongoose.Schema({
  organizationName: {
    type: String,
    trim: true,
    required: true
  },

  organizationType: {
    type: String,
    enum: ['Employer', 'Recruitment Agency', 'HR Firm', 'Other'],
    trim: true,
    required: true
  },

  organizationId: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },

  cacNumber: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },

  cacCertificate: {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  },

  officialEmail: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },
  
  phoneNumber: {
    type: String,
    trim: true,
    required: true,
  },

  address: {
    type: String,
    trim: true,
    required: true,
  },

  website: {
    type: String,
    trim: true
  },

  status: {
    type: String,
    enum: ['Active', 'Rejected', 'Suspended', 'Pending Approval'],
    trim: true,
    required: true,
    default: 'Pending Approval'
  },

  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  rejectedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date,
  },

  rejectedAt: {
    type: Date,
  },

  rejectionReason: {
    type: String,
    trim: true
  }

},
{ timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);