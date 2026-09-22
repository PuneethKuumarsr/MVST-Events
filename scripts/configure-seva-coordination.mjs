// Usage: node scripts/configure-seva-coordination.mjs server/data/<private-file>.json
// The private input file must never be committed or placed in public assets.
import fs from 'node:fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { SevaCoordinationSettings } from '../server/models/SevaCoordinationSettings.js';
import { validateSevaCoordination, SEVA_COORDINATION_ID } from '../server/seva-coordination.js';

dotenv.config({ quiet: true });
try {
  if (!process.argv[2]) throw new Error('A private contact input file is required.');
  if (!process.env.MONGODB_URI) throw new Error('Private storage is not configured.');
  const settings = validateSevaCoordination(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || 'mvst_seva_portal',
    serverSelectionTimeoutMS: 8000, autoIndex: false, autoCreate: false,
  });
  const previous = await SevaCoordinationSettings.findById(SEVA_COORDINATION_ID).lean();
  if (previous) {
    if (JSON.stringify(validateSevaCoordination(previous)) !== JSON.stringify(settings)) {
      throw new Error('Existing contact setup differs. Review it before changing it; nothing was overwritten.');
    }
    console.log('The same contact setup is already saved. No changes made.');
  } else {
    await SevaCoordinationSettings.create({
      _id: SEVA_COORDINATION_ID, ...settings, updatedBy: 'User-confirmed MVST booking contact setup',
    });
    const saved = await SevaCoordinationSettings.findById(SEVA_COORDINATION_ID).lean();
    if (JSON.stringify(validateSevaCoordination(saved)) !== JSON.stringify(settings)) throw new Error('Verification failed.');
    console.log(JSON.stringify({ saved: true, contacts: Object.values(settings.groups).reduce((sum, rows) => sum + rows.length, 0), driverReplyTimeoutMinutes: settings.driverReplyTimeoutMinutes, deliveryActive: false }));
  }
} catch (error) {
  // Do not print database errors containing connection details or private contacts.
  console.error(error?.name === 'Error' ? error.message : 'Contact setup could not be saved. Check private storage and input.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
