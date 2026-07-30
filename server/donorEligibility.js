function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function isDirectBottuDonor(donor) {
  const nature = String(donor?.contributionNature || '').trim().toLowerCase();
  return nature.includes('material') || nature.includes('kind');
}

export function isConfirmedDonor(donor) {
  const status = String(donor?.status || '').trim().toLowerCase();
  return status !== 'cancelled' && (
    ['confirmed', 'paid', 'received', 'fully received', 'promised', 'promise'].includes(status) ||
    numberValue(donor?.confirmedQuantity || donor?.sponsored2026) > 0
  );
}

export function donorPaymentVerified(donor) {
  const status = String(donor?.status || donor?.paymentStatus || '').trim().toLowerCase();
  if (isDirectBottuDonor(donor) && isConfirmedDonor(donor)) return true;
  return Boolean(donor?.treasurerVerified) || status.includes('received');
}

const PAYMENT_COLLECTION_FIELDS = [
  'status',
  'treasurerVerified',
  'receivedAmount',
  'receivedQuantity',
  'paymentMode',
  'bankOrCash',
  'paymentDate',
  'transactionReference',
  'collectedBy',
];

export function ensurePaymentCollector(donor, updates, actor) {
  const next = { ...(updates || {}) };
  const touchesPayment = PAYMENT_COLLECTION_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(next, field));
  if (!touchesPayment) return next;

  const effectiveDonor = { ...(donor || {}), ...next };
  if (isDirectBottuDonor(effectiveDonor) || !donorPaymentVerified(effectiveDonor)) return next;

  const collector = String(effectiveDonor.collectedBy || '').trim();
  const recorder = String(actor || '').trim();
  if (!collector && recorder) next.collectedBy = recorder;
  return next;
}
