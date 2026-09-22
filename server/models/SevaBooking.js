import mongoose from 'mongoose';

const sevaBookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true, trim: true },
    applicantName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: '', trim: true },
    locality: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    occasion: { type: String, required: true, trim: true },
    requestedDate: { type: String, required: true, index: true },
    preferredSlot: { type: String, enum: ['DAY', 'EVENING'], required: true },
    notes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    decisionNotes: { type: String, default: '', trim: true },
    decidedAt: { type: Date, default: null },
    decidedBy: { type: String, default: '' },
  },
  { timestamps: true, collection: 'seva_bookings' },
);

// MVST currently manages one Silver Idol in two separate seva windows each day.
sevaBookingSchema.index(
  { requestedDate: 1, preferredSlot: 1 },
  { unique: true, partialFilterExpression: { status: 'APPROVED' } },
);
sevaBookingSchema.index({ status: 1, requestedDate: 1 });

export const SevaBooking = mongoose.models.SevaBooking || mongoose.model('SevaBooking', sevaBookingSchema);
