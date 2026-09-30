import mongoose from "mongoose";


const institutionSchema = new mongoose.Schema({
  institutionName: {
    type: String,
    trim: true,
    required: true
  },

  institutionType: {
    type: String,
    enum: ['Government Institution', 'University', 'Polytechnic', 'Other'],
    required: true,
    trim: true
  },

  institutionId: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  officialEmail: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  website: {
    type: String,
    trim: true
  },

  accreditationDocument: {
    url:{
      type: String,
      required: true
    }
  },

  status: {
    type: String,
    enum: ['Active', 'Rejected', 'Suspended', 'Pending Approval'],
    default: 'Pending Approval',
    trim: true
  },

  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  rejectionReason: {
    type: String,
    trim: true
  }
},
{ timestamps: true }
);

export const Institution = mongoose.model('Institution', institutionSchema);