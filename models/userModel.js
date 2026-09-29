import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true
  },

  lastName: {
    type: String,
    trim: true,
    required: true
  },

  email: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    trim: true
  },

  role: {
    type: String,
    enum: ['Citizen', 'Organization', 'Institution', 'Admin'],
    required: true,
    trim: true
  },

  accountStatus: {
    type: String,
    enum: ['Active', 'Pending Approval', 'Rejected'],
    default: 'Active',
    trim: true
  },

  organizationId: {
    type: String,
    trim: true,
    required: function () {
      return this.role === 'Organization'
    }
  },

  institutionId: {
    type: String,
    trim: true,
    required: function () {
      return this.role === 'Institution'
    }
  },

  membershipStatus: {
    type: String,
    trim: true,
    enum: ['Pending', 'Active', 'Rejected'],
    default: function () {
      if (this.role === 'Organization' || this.role === 'Institution') {
        return 'Pending'
      }
    }
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true
}
);

export const User = mongoose.model('User', userSchema);