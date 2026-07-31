export const WHATSAPP_GROUP_NEW_CONTACT_START_DATE = '27 July 2026';
export const WHATSAPP_GROUP_NEW_CONTACT_DATE_KEY = 20260727;
export const WHATSAPP_GROUP_REASSIGNED_SEAT = 'C-06';

export function googleFormRegistrationDateKey(timestamp) {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return (Number(isoMatch[1]) * 10000) + (Number(isoMatch[2]) * 100) + Number(isoMatch[3]);
  }

  // Google Forms timestamps in the participant sheets use M/D/YYYY.
  const formMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!formMatch) return null;
  return (Number(formMatch[3]) * 10000) + (Number(formMatch[1]) * 100) + Number(formMatch[2]);
}

function normalizedSeatNumber(seatNo) {
  const match = String(seatNo || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .match(/^([A-Z]+)-?0*(\d+)$/);
  if (!match) return '';
  return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}`;
}

export function isWhatsAppGroupNewParticipant(participant) {
  const isReassignedBhimarathaSeat = participant?.eventType === 'bhimaratha'
    && normalizedSeatNumber(participant?.seatNo) === WHATSAPP_GROUP_REASSIGNED_SEAT;
  if (isReassignedBhimarathaSeat) return true;

  const registrationDateKey = googleFormRegistrationDateKey(participant?.timestamp);
  return registrationDateKey !== null && registrationDateKey >= WHATSAPP_GROUP_NEW_CONTACT_DATE_KEY;
}
