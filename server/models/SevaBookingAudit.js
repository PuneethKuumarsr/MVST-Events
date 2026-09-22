import mongoose from 'mongoose';

const sevaBookingAuditSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, index: true },
    reference: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED'],
      index: true,
    },
    actorUserId: { type: String, default: '' },
    actorName: { type: String, required: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    remarks: { type: String, default: '' },
  },
  { timestamps: true, collection: 'seva_booking_audits' },
);

sevaBookingAuditSchema.index({ bookingId: 1, occurredAt: -1 });

export const SevaBookingAudit = mongoose.models.SevaBookingAudit ||
  mongoose.model('SevaBookingAudit', sevaBookingAuditSchema);
