import assert from 'node:assert/strict';
import {
  buildEventInvitationMessage,
  DEFAULT_DONOR_INVITATION_MESSAGE,
  DEFAULT_TRUSTEE_MESSAGE,
} from '../src/eventInvitation.js';
import {
  firstPendingQueueIndex,
  markQueueSentThroughRecipient,
  queueCounts,
} from '../src/queueStatus.js';
import {
  frontendBundleChanged,
  frontendBundlePathFromHtml,
  frontendBundlePathFromScripts,
} from '../src/appFreshness.js';
import {
  extractGeneralDonorQrToken,
  generalDonorFingerprint,
  GENERAL_DONOR_QR_PREFIX,
} from '../server/generalDonorIdentity.js';
import { donorPaymentVerified } from '../server/donorEligibility.js';

const trusteeMessage = buildEventInvitationMessage('Sri Trustee');
assert.match(trusteeMessage, /Dear Sri Trustee,/);
assert.match(trusteeMessage, /Esteemed Members/);
assert.match(trusteeMessage, /immense pleasure and heartfelt respect/);
assert.match(trusteeMessage, /sign the attendance register and collect your food coupon/);
assert.match(trusteeMessage, /Ashoka T N - 9449653053/);
assert.match(trusteeMessage, /Kedarnath M\.N - 95350 56868/);
assert.doesNotMatch(trusteeMessage, /This is a message from/);
assert.doesNotMatch(trusteeMessage, /\{\{Name\}\}/);

const donorMessage = buildEventInvitationMessage('Sri Donor', DEFAULT_DONOR_INVITATION_MESSAGE);
assert.match(donorMessage, /Dear Sri Donor,/);
assert.match(donorMessage, /Esteemed Donors/);
assert.match(donorMessage, /Kindly collect your food coupon upon arrival/);
assert.match(donorMessage, /Kedarnath M\.N - 95350 56868/);
assert.doesNotMatch(donorMessage, /sign the attendance register/);
assert.equal(buildEventInvitationMessage('', DEFAULT_TRUSTEE_MESSAGE).includes('Dear Esteemed Member,'), true);
assert.equal(buildEventInvitationMessage('Lower Token', 'Dear {{name}}'), 'Dear Lower Token');

const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const statuses = {
  a: { status: 'Prepared' },
  b: { status: 'Sent' },
  c: { status: 'Skipped' },
  d: { status: 'Failed' },
};
assert.deepEqual(queueCounts(queue, statuses), {
  total: 4,
  sent: 1,
  prepared: 1,
  skipped: 1,
  failed: 1,
  remaining: 0,
});
assert.equal(firstPendingQueueIndex(queue, statuses), 3, 'Failed entries remain retryable');
assert.equal(firstPendingQueueIndex(queue.slice(0, 3), statuses), -1, 'Completed queues must not reopen a recipient');

const trusteeRecoveryQueue = [
  { id: 'trustee-1', name: 'AMARNATH CA' },
  { id: 'trustee-2', name: 'INDRA JAGANNATHA SETTY' },
  { id: 'trustee-3', name: 'JAYALAKSHMI  K S' },
  { id: 'trustee-4', name: 'KALA PRADEEP' },
];
const recoveredTrusteeProgress = markQueueSentThroughRecipient(
  trusteeRecoveryQueue,
  {},
  'Jayalakshmi K S',
  (trustee) => ({ recipient: trustee.name }),
);
assert.equal(recoveredTrusteeProgress.throughIndex, 2, 'Trustee recovery must find names despite repeated spaces');
assert.equal(recoveredTrusteeProgress.statusMap['trustee-1'].status, 'Sent');
assert.equal(recoveredTrusteeProgress.statusMap['trustee-3'].status, 'Sent');
assert.equal(recoveredTrusteeProgress.statusMap['trustee-4'], undefined, 'Trustee recovery must not mark later recipients');
assert.equal(firstPendingQueueIndex(trusteeRecoveryQueue, recoveredTrusteeProgress.statusMap), 3, 'Trustee recovery must resume from the name after the confirmed recipient');

const oldBundle = frontendBundlePathFromScripts(['https://mvst-events.onrender.com/assets/index-old123.js']);
const latestBundle = frontendBundlePathFromHtml('<script type="module" src="/assets/index-new456.js"></script>');
assert.equal(oldBundle, '/assets/index-old123.js');
assert.equal(latestBundle, '/assets/index-new456.js');
assert.equal(frontendBundleChanged(oldBundle, latestBundle), true, 'A restored stale Safari page must detect the newer app bundle');
assert.equal(frontendBundleChanged(latestBundle, latestBundle), false, 'The current app bundle must not reload unnecessarily');

const donor = {
  eventYear: '2026',
  slNo: '42',
  donorName: 'Sri Donor',
  contactNo: '+91 98765 43210',
};
const sameDonorDifferentFormatting = {
  eventYear: '2026',
  slNo: '42',
  donorName: '  SRI DONOR ',
  contactNo: '9876543210',
};
assert.equal(generalDonorFingerprint(donor), generalDonorFingerprint(sameDonorDifferentFormatting));
assert.notEqual(generalDonorFingerprint(donor), generalDonorFingerprint({ ...donor, contactNo: '9123456780' }));
assert.equal(extractGeneralDonorQrToken(`https://mvst-events.onrender.com${GENERAL_DONOR_QR_PREFIX}abc123?x=1`), 'abc123');
assert.equal(extractGeneralDonorQrToken('abc123'), 'abc123');
assert.equal(extractGeneralDonorQrToken('MVST|DONOR|unsafe'), '');

assert.equal(donorPaymentVerified({
  contributionNature: 'Material / In Kind',
  status: 'Confirmed',
  confirmedQuantity: 1,
  treasurerVerified: false,
}), true, 'Confirmed Direct Bottu sponsors are QR eligible without a cash payment');
assert.equal(donorPaymentVerified({
  contributionNature: 'Monetary',
  status: 'Confirmed',
  confirmedQuantity: 1,
  treasurerVerified: false,
}), false, 'Unverified monetary sponsors remain QR ineligible');
assert.equal(donorPaymentVerified({
  contributionNature: 'Monetary',
  status: 'Payment Received',
}), true);

console.log('Event invitation, queue status, and donor QR identity behavior checks passed.');
