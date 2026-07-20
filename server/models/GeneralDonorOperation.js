import mongoose from 'mongoose';

const generalDonorOperationSchema = new mongoose.Schema(
  {
    eventYear: { type: String, required: true, index: true },
    donorSourceId: { type: String, required: true, index: true },
    tokenRef: { type: String, default: '', trim: true },
    tokenHash: { type: String, default: '', trim: true },
    qrStatus: { type: String, enum: ['NOT_GENERATED', 'ACTIVE', 'REVOKED'], default: 'NOT_GENERATED', index: true },
    campaignName: { type: String, default: '' },
    campaignStatus: { type: String, enum: ['Pending', 'Sent', 'Skipped', 'Failed'], default: 'Pending', index: true },
    campaignStatusAt: { type: Date, default: null },
    campaignStatusBy: { type: String, default: '' },
    campaignRemarks: { type: String, default: '' },
    whatsappDestination: { type: String, default: '' },
  },
  { timestamps: true, collection: 'general_donor_operations' },
);

generalDonorOperationSchema.index({ eventYear: 1, donorSourceId: 1 }, { unique: true });
generalDonorOperationSchema.index(
  { tokenHash: 1 },
  { unique: true, partialFilterExpression: { tokenHash: { $type: 'string', $gt: '' } } },
);
generalDonorOperationSchema.index({ eventYear: 1, campaignStatus: 1 });
generalDonorOperationSchema.index({ eventYear: 1, campaignName: 1, campaignStatus: 1 });

export const GeneralDonorOperation = mongoose.models.GeneralDonorOperation ||
  mongoose.model('GeneralDonorOperation', generalDonorOperationSchema);
