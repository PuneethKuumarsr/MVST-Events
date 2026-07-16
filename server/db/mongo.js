import mongoose from 'mongoose';

let connectionPromise = null;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectMongo() {
  if (!isMongoConfigured()) return null;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'mvst_seva_portal',
      serverSelectionTimeoutMS: 5000,
    });
  }
  return connectionPromise;
}
