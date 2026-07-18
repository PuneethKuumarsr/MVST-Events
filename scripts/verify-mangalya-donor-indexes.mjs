import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { MangalyaDonorAudit } from '../server/models/MangalyaDonorAudit.js';
import { MangalyaDonorOperation } from '../server/models/MangalyaDonorOperation.js';

dotenv.config();

function normalizeReceipt(value) {
  const match = String(value || '').trim().toUpperCase().match(/^M\s*-?\s*(\d{1,3})$/);
  return match ? `M${String(Number(match[1])).padStart(3, '0')}` : '';
}

function countDuplicates(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  console.log(JSON.stringify({
    ok: false,
    dryRunOnly: true,
    error: 'MongoDB is not configured.',
  }, null, 2));
  process.exit(0);
}

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB,
  autoIndex: false,
  autoCreate: false,
});

const operations = await MangalyaDonorOperation.find({}).lean();
const operationIndexes = await MangalyaDonorOperation.collection.indexes();
const auditIndexes = await MangalyaDonorAudit.collection.indexes().catch(() => []);
const receiptKeys = operations
  .map((operation) => {
    const receipt = normalizeReceipt(operation.receiptNumberNormalized || operation.receiptNumber);
    return receipt ? `${operation.eventYear}:${receipt}` : '';
  })
  .filter(Boolean);

const report = {
  ok: true,
  dryRunOnly: true,
  noIndexesCreated: true,
  database: process.env.MONGODB_DB,
  operationRecords: operations.length,
  duplicateChecks: {
    eventYearDonorSourceId: countDuplicates(operations.map((operation) => `${operation.eventYear}:${operation.donorSourceId}`)),
    tokenHash: countDuplicates(operations.map((operation) => operation.tokenHash)),
    eventYearReceiptNumberNormalized: countDuplicates(receiptKeys),
  },
  existingIndexes: {
    mangalyaDonorOperations: operationIndexes,
    mangalyaDonorAudits: auditIndexes,
  },
  proposedIndexes: {
    mangalyaDonorOperations: [
      '{ eventYear: 1, donorSourceId: 1 } unique',
      '{ tokenHash: 1 } unique partial nonblank',
      '{ eventYear: 1, receiptNumberNormalized: 1 } unique partial nonblank',
      '{ eventYear: 1, honourStatus: 1 }',
      '{ eventYear: 1, arrivalStatus: 1 }',
    ],
    mangalyaDonorAudits: [
      '{ eventYear: 1, donorSourceId: 1, createdAt: -1 }',
      '{ eventYear: 1, eventType: 1, createdAt: -1 }',
    ],
  },
};

console.log(JSON.stringify(report, null, 2));
await mongoose.disconnect();
