import mongoose from 'mongoose';

const generalDonorAuditSchema = new mongoose.Schema(
  {
    eventYear: { type: String, required: true, index: true },
    donorSourceId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'GENERAL_DONOR_QR_GENERATED',
        'GENERAL_DONOR_QR_REGENERATED',
        'GENERAL_DONOR_QR_REVOKED',
        'GENERAL_DONOR_CAMPAIGN_STATUS',
      ],
      index: true,
    },
    actorUserId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    remarks: { type: String, default: '' },
  },
  { timestamps: true, collection: 'general_donor_audits' },
);

generalDonorAuditSchema.index({ eventYear: 1, donorSourceId: 1, createdAt: -1 });
generalDonorAuditSchema.index({ eventYear: 1, eventType: 1, createdAt: -1 });

export const GeneralDonorAudit = mongoose.models.GeneralDonorAudit ||
  mongoose.model('GeneralDonorAudit', generalDonorAuditSchema);
