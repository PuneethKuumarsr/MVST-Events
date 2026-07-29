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
