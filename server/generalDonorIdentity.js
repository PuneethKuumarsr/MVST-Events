import crypto from 'node:crypto';

export const GENERAL_DONOR_QR_PREFIX = '/qr/donor/';

export function generalDonorFingerprint(row, fallbackEventYear = '2026') {
  const eventYear = String(row?.eventYear || fallbackEventYear).trim();
  const name = String(row?.donorName || row?.sponsorName || row?.name || '').trim().toLowerCase();
  const mobileDigits = String(row?.contactNo || '').replace(/\D/g, '');
  const mobile = mobileDigits.length >= 10 ? mobileDigits.slice(-10) : mobileDigits;
  const serial = String(row?.slNo || '').trim().toLowerCase();
  return crypto
    .createHash('sha256')
    .update([eventYear, serial, name, mobile].join('|'))
    .digest('hex');
}

export function extractGeneralDonorQrToken(rawToken) {
  const token = String(rawToken || '').trim();
  const markerIndex = token.indexOf(GENERAL_DONOR_QR_PREFIX);
  const tokenValue = markerIndex >= 0
    ? token.slice(markerIndex + GENERAL_DONOR_QR_PREFIX.length).split(/[?#]/)[0]
    : token;
  return !tokenValue || tokenValue.includes('|') ? '' : tokenValue;
}
