import mongoose from 'mongoose';

const mangalyaDonorOperationSchema = new mongoose.Schema(
  {
    eventYear: { type: String, required: true, index: true },
    donorSourceId: { type: String, required: true, index: true },
    receiptNumber: { type: String, default: '', trim: true },
    receiptNumberNormalized: { type: String, default: '', trim: true },
    tokenRef: { type: String, default: '', trim: true },
    tokenHash: { type: String, default: '', trim: true },
    qrStatus: { type: String, enum: ['NOT_GENERATED', 'ACTIVE', 'REVOKED'], default: 'NOT_GENERATED', index: true },
    invitationPreparedAt: { type: Date, default: null },
    invitationPreparedBy: { type: String, default: '' },
    whatsappDestination: { type: String, default: '' },
    arrivalStatus: { type: String, enum: ['NOT_ARRIVED', 'ARRIVED'], default: 'NOT_ARRIVED', index: true },
    arrivedAt: { type: Date, default: null },
    arrivedBy: { type: String, default: '' },
    honourStatus: { type: String, enum: ['PENDING', 'HONOURED'], default: 'PENDING', index: true },
    honouredAt: { type: Date, default: null },
    honouredBy: { type: String, default: '' },
  },
  { timestamps: true, collection: 'mangalya_donor_operations' },
);

mangalyaDonorOperationSchema.pre('validate', function normalizeReceiptNumber(next) {
  const raw = String(this.receiptNumber || '').trim().toUpperCase();
  const match = raw.match(/^M\s*-?\s*(\d{1,3})$/);
  this.receiptNumberNormalized = match ? `M${String(Number(match[1])).padStart(3, '0')}` : '';
  next();
});

mangalyaDonorOperationSchema.index({ eventYear: 1, donorSourceId: 1 }, { unique: true });
mangalyaDonorOperationSchema.index(
  { eventYear: 1, receiptNumberNormalized: 1 },
  { unique: true, partialFilterExpression: { receiptNumberNormalized: { $type: 'string', $gt: '' } } },
);
mangalyaDonorOperationSchema.index(
  { tokenHash: 1 },
  { unique: true, partialFilterExpression: { tokenHash: { $type: 'string', $gt: '' } } },
);
mangalyaDonorOperationSchema.index({ eventYear: 1, honourStatus: 1 });
mangalyaDonorOperationSchema.index({ eventYear: 1, arrivalStatus: 1 });

export const MangalyaDonorOperation = mongoose.models.MangalyaDonorOperation ||
  mongoose.model('MangalyaDonorOperation', mangalyaDonorOperationSchema);
