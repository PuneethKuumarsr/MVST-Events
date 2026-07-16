import mongoose from 'mongoose';

const qrTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    tokenVersion: { type: String, required: true, default: 'mvstqr:v1' },
    participantId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    rowNumber: { type: Number, default: null },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'qr_tokens' },
);

export const QrToken = mongoose.models.QrToken || mongoose.model('QrToken', qrTokenSchema);
