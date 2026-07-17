import mongoose from 'mongoose';

let connectionPromise = null;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectMongo() {
  if (!isMongoConfigured()) return null;
  if (!connectionPromise) {
    const dbName = process.env.MONGODB_DB || 'mvst_seva_portal';
    console.log('Mongo auth starting');
    console.log(`MONGODB_URI present: ${Boolean(process.env.MONGODB_URI)}`);
    console.log(`MONGODB_DB: ${dbName}`);
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'mvst_seva_portal',
      serverSelectionTimeoutMS: 5000,
    }).then((connection) => {
      console.log('Mongo connected successfully');
      console.log(`Database: ${connection.connection.db.databaseName}`);
      return connection;
    }).catch((error) => {
      console.error(error?.name || 'MongoError');
      if (error?.code !== undefined) console.error(`Error code: ${error.code}`);
      console.error(error?.message || 'Mongo connection failed');
      console.error(error?.stack || error);
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}
