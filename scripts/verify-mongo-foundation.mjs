import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo, isMongoConfigured } from '../server/db/mongo.js';
import { DistributionLog } from '../server/models/DistributionLog.js';
import { QrToken } from '../server/models/QrToken.js';
import { Session } from '../server/models/Session.js';
import { User } from '../server/models/User.js';

dotenv.config();

const requiredCollections = ['users', 'sessions', 'qr_tokens', 'distribution_logs'];

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

async function ensureCollections() {
  for (const model of [User, Session, QrToken, DistributionLog]) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

async function cleanup(testId) {
  await DistributionLog.deleteMany({ participantId: testId });
  await QrToken.deleteMany({ participantId: testId });
  await Session.deleteMany({ tokenHash: hash(testId) });
  await User.deleteMany({ mobile: `919000${testId.slice(-6)}` });
}

async function run() {
  if (!isMongoConfigured()) {
    console.log('MongoDB verification skipped: MONGODB_URI is not configured.');
    return;
  }

  await connectMongo();
  const dbName = mongoose.connection.db.databaseName;
  if (dbName !== (process.env.MONGODB_DB || 'mvst_seva_portal')) {
    throw new Error(`Connected to unexpected database: ${dbName}`);
  }

  await ensureCollections();
  const collections = (await mongoose.connection.db.listCollections().toArray()).map((item) => item.name);
  for (const collection of requiredCollections) {
    if (!collections.includes(collection)) throw new Error(`Missing collection: ${collection}`);
  }

  const testId = `mongo_verify_${Date.now()}`;
  await cleanup(testId);

  const user = await User.create({
    name: 'MVST Verification User',
    mobile: `919000${testId.slice(-6)}`,
    role: 'VOLUNTEER',
    pinHash: `verify:${hash(testId)}`,
    active: true,
  });
  if (!user._id) throw new Error('User verification failed');

  const session = await Session.create({
    tokenHash: hash(testId),
    userId: user._id,
    loginAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    lastActivity: new Date(),
  });
  if (!session._id) throw new Error('Session verification failed');

  const qrToken = await QrToken.create({
    tokenHash: hash(`qr:${testId}`),
    participantId: testId,
    eventType: 'shashtipoorthi',
    rowNumber: 1,
    active: true,
  });
  if (!qrToken._id) throw new Error('QR token verification failed');

  const log = await DistributionLog.create({
    participantId: testId,
    eventType: 'shashtipoorthi',
    rowNumber: 1,
    operation: 'meetingAttendance',
    status: 'completed',
    operatorUserId: String(user._id),
    operatorName: 'MVST Verification User',
    occurredAt: new Date(),
  });
  if (!log._id) throw new Error('Distribution log verification failed');

  await cleanup(testId);
  await mongoose.disconnect();
  console.log(`MongoDB foundation verified: ${dbName} -> ${requiredCollections.join(', ')}`);
}

run().catch(async (error) => {
  await mongoose.disconnect().catch(() => {});
  console.error(error.message);
  process.exit(1);
});
