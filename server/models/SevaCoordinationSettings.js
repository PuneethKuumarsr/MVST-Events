import mongoose from 'mongoose';
import { SEVA_COORDINATION_ID, SEVA_CONTACT_GROUPS } from '../seva-coordination.js';

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  mobile: { type: String, required: true, match: /^91[6-9]\d{9}$/ },
}, { _id: false });

const schema = new mongoose.Schema({
  _id: { type: String, default: SEVA_COORDINATION_ID },
  groups: Object.fromEntries(SEVA_CONTACT_GROUPS.map(key => [key, [contactSchema]])),
  driverReplyTimeoutMinutes: { type: Number, required: true, min: 1, max: 1440 },
  updatedBy: { type: String, required: true },
}, { timestamps: true, collection: 'seva_coordination_settings' });

export const SevaCoordinationSettings = mongoose.models.SevaCoordinationSettings
  || mongoose.model('SevaCoordinationSettings', schema);
