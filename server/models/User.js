import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, index: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['PST_ADMIN', 'VOLUNTEER', 'CREW'],
      default: 'VOLUNTEER',
      index: true,
    },
    pinHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: false, index: true },
    passwordChangedAt: { type: Date, default: null },
    passwordAudit: [{
      action: { type: String, required: true },
      changedBy: { type: String, default: '' },
      changedByName: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    }],
    active: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
