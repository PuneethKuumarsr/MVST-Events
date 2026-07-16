import mongoose from 'mongoose';

const distributionLogSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    rowNumber: { type: Number, default: null },
    operation: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: ['completed', 'already-completed', 'failed'] },
    operatorUserId: { type: String, required: true, index: true },
    operatorName: { type: String, required: true },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, collection: 'distribution_logs' },
);

export const DistributionLog = mongoose.models.DistributionLog || mongoose.model('DistributionLog', distributionLogSchema);
