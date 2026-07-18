import mongoose from 'mongoose';

const mangalyaDonorAuditSchema = new mongoose.Schema(
  {
    eventYear: { type: String, required: true, index: true },
    donorSourceId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'MANGALYA_QR_GENERATED',
        'MANGALYA_QR_REGENERATED',
        'MANGALYA_QR_REVOKED',
        'MANGALYA_INVITATION_PREPARED',
        'MANGALYA_ARRIVED',
        'MANGALYA_HONOURED',
        'MANGALYA_HONOUR_REVERSED',
      ],
      index: true,
    },
    actorUserId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    remarks: { type: String, default: '' },
  },
  { timestamps: true, collection: 'mangalya_donor_audits' },
);

mangalyaDonorAuditSchema.index({ eventYear: 1, donorSourceId: 1, createdAt: -1 });
mangalyaDonorAuditSchema.index({ eventYear: 1, eventType: 1, createdAt: -1 });

export const MangalyaDonorAudit = mongoose.models.MangalyaDonorAudit ||
  mongoose.model('MangalyaDonorAudit', mangalyaDonorAuditSchema);
