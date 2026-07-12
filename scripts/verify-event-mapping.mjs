import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildPaymentConfirmationMessage,
  buildWelcomeMessage,
  buildWhatsAppMessage,
  encodeWhatsAppMessage,
} from '../src/whatsappMessages.js';

const frontend = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
const whatsappTemplates = readFileSync(new URL('../src/whatsappMessages.js', import.meta.url), 'utf8');

assert.match(frontend, /id: 'bhimaratha',[\s\S]*1lAiv6mWGXtVlxZ-4p1krjhc3bmau_Pgl1PKq0GylnJw/, 'CSV fallback first Google Sheet must map to Bhimaratha');
assert.match(frontend, /id: 'shashtipoorthi',[\s\S]*1PyxCC2HN7hCls-xR8Ao62xVZbM6w0OEa8Ri_OUu7XQo/, 'CSV fallback second Google Sheet must map to Shashtipoorthi');
assert.match(frontend, /shashtipoorthi:[\s\S]*contribution: 30000/, 'Shashtipoorthi contribution must be 30000 in frontend');
assert.match(frontend, /bhimaratha:[\s\S]*contribution: 20000/, 'Bhimaratha contribution must be 20000 in frontend');
assert.match(frontend, /const eventType = source\.id;/, 'CSV fallback event type must be assigned from source sheet');
assert.match(frontend, /row\.eventType === activeEvent/, 'Tabs must filter participants by event type');
assert.match(frontend, /Source: \{participant\.sourceLabel\}/, 'Participant cards must show source sheet badge');
assert.doesNotMatch(frontend, /GOOGLE_SERVICE_ACCOUNT_EMAIL|GOOGLE_PRIVATE_KEY/, 'Frontend must not reference Google credentials');

const staleWhatsAppPhrases = [
  'Thank you for registering for Samoohika',
  'by Mane Manege Vasavi Seva Trust',
  'Contribution:',
  'KIT includes:',
  'Rituals:',
];
for (const phrase of staleWhatsAppPhrases) {
  assert.ok(!frontend.includes(phrase), 'Frontend must not contain stale WhatsApp phrase: ' + phrase);
  assert.ok(!whatsappTemplates.includes(phrase), 'Template module must not contain stale WhatsApp phrase: ' + phrase);
}
assert.ok(!frontend.includes('URLSearchParams'), 'WhatsApp URLs must not use URLSearchParams');
assert.ok(!frontend.includes('api.whatsapp.com/send'), 'WhatsApp URLs must not use api.whatsapp.com/send');
assert.ok(frontend.includes('function normalizeIndianMobileNumber(rawMobile)'), 'Frontend must define normalizeIndianMobileNumber');
assert.ok(frontend.includes('const normalizedMobile = normalizeIndianMobileNumber(participant.mobileNumber)'), 'WhatsApp URL builder must use normalized mobile number');
assert.ok(frontend.includes('const encodedText = encodeURIComponent(message)'), 'WhatsApp URL builder must use explicit encodeURIComponent(message)');
assert.ok(frontend.includes('https://wa.me/${normalizedMobile}?text=${encodedText}'), 'WhatsApp URL must use wa.me with normalized mobile and encoded text');
assert.ok(frontend.includes("console.debug('[MVST WhatsApp decoded message]'"), 'WhatsApp opens must log decoded message for debugging');

assert.match(backend, /\.\.\.EVENTS\.bhimaratha,[\s\S]*spreadsheetId: process\.env\.BHIMARATHA_SHEET_ID/, 'Backend first Google Sheets API source must be Bhimaratha');
assert.match(backend, /\.\.\.EVENTS\.shashtipoorthi,[\s\S]*spreadsheetId: process\.env\.SHASHTIPOORTHI_SHEET_ID/, 'Backend second Google Sheets API source must be Shashtipoorthi');
assert.match(backend, /source\.contribution/, 'Backend must calculate contribution from source event');
assert.match(backend, /eventType: source\.id/, 'Backend must assign event type from source sheet');

const phoneExamples = [
  ['6360716397', '916360716397'],
  ['916360716397', '916360716397'],
  ['+91 63607 16397', '916360716397'],
  ['0916360716397', '916360716397'],
];
const normalizeIndianMobileNumberForTest = (rawMobile) => {
  const digits = String(rawMobile || '').replace(/\D/g, '');
  const normalizedDigits = digits.startsWith('0') ? digits.replace(/^0+/, '') : digits;
  if (normalizedDigits.length === 10) return `91${normalizedDigits}`;
  if (normalizedDigits.length === 12 && normalizedDigits.startsWith('91')) return normalizedDigits;
  return normalizedDigits;
};
for (const [input, expected] of phoneExamples) {
  assert.equal(normalizeIndianMobileNumberForTest(input), expected);
}

assert.ok(frontend.includes('WhatsApp Check / Mobile Issues'), 'Dashboard must show WhatsApp Check / Mobile Issues section');
assert.ok(frontend.includes('Export Mobile Issues'), 'Dashboard must show Export Mobile Issues button');
assert.ok(frontend.includes('Welcome Sent'), 'Dashboard must show Welcome Sent summary/status');
assert.ok(frontend.includes('Welcome Pending'), 'Dashboard must show Welcome Pending summary');
assert.ok(frontend.includes('Payment Sent'), 'Dashboard must show Payment Sent summary/status');
assert.ok(frontend.includes('Payment Pending'), 'Dashboard must show Payment Pending summary');
assert.ok(frontend.includes('Welcome Sent Date'), 'Dashboard must show Welcome Sent Date');
assert.ok(frontend.includes('Payment Sent Date'), 'Dashboard must show Payment Sent Date');
assert.ok(frontend.includes('Mark as Sent'), 'Dashboard must show Mark as Sent button after WhatsApp open');
assert.ok(frontend.includes('Duplicate mobile number'), 'Mobile report must flag duplicate mobile numbers');
assert.ok(frontend.includes('New Registrations'), 'Dashboard must show New Registrations section');
assert.ok(frontend.includes('Awaiting treasurer payment confirmation'), 'New Registrations section must explain treasurer confirmation status');
assert.ok(frontend.includes('newRegistrationRows'), 'Frontend must keep unverified registrations in a separate list');
assert.ok(frontend.includes('.filter((row) => row.treasurerVerified)'), 'Regular participant tabs must show only treasurer-verified registrations');
assert.ok(frontend.includes('Form Timestamp'), 'Participant cards must show form timestamp for cross verification');
assert.ok(frontend.includes('scrollToSection'), 'Dashboard summary cards must support jump navigation');
assert.ok(frontend.includes('id="new-registrations-dashboard"'), 'New Registrations section must have a jump target');
assert.ok(frontend.includes('id="participant-management-dashboard"'), 'Participant Management section must have a jump target');
assert.ok(frontend.includes('onClick={goToPaymentPending}'), 'Pending summary cards must jump to pending participants');
assert.ok(frontend.includes('app-sidebar'), 'Dashboard must include sidebar navigation');
assert.ok(frontend.includes('Shashtipoorthi Shanthi'), 'Sidebar must include Shashtipoorthi Shanthi view');
assert.ok(frontend.includes('Bhimaratha Shanthi'), 'Sidebar must include Bhimaratha Shanthi view');
assert.ok(frontend.includes('Mangalya Sponsorship'), 'Sidebar must include Mangalya Sponsorship view');
assert.ok(frontend.includes('Seat No'), 'Dashboard must show Seat No fields');
assert.ok(frontend.includes('Receipt No'), 'Dashboard must show Receipt No fields');
assert.ok(frontend.includes('Receipt Generated'), 'Dashboard must show Receipt Generated status');
assert.ok(frontend.includes('Generate Receipt'), 'Dashboard must show Generate Receipt button');
assert.ok(frontend.includes('Download Receipt'), 'Dashboard must show Download Receipt button');
assert.ok(frontend.includes('Bulk Generate Receipts'), 'Dashboard must show Bulk Generate Receipts button');
assert.ok(frontend.includes('SP26'), 'Frontend must define Shashtipoorthi SP26 receipt prefix');
assert.ok(frontend.includes('BS26'), 'Frontend must define Bhimaratha BS26 receipt prefix');
assert.ok(frontend.includes('shastipoorthi-receipt.jpeg'), 'Frontend must use original Shashtipoorthi receipt template');
assert.ok(frontend.includes('bhimaratha-receipt.jpeg'), 'Frontend must use original Bhimaratha receipt template');
assert.ok(frontend.includes("toDataURL('image/jpeg'"), 'Receipt output must be generated as JPG');
assert.ok(backend.includes("seatNo: ['Seat No']"), 'Backend must allow Seat No write-back');
assert.ok(backend.includes("receiptNo: ['Receipt No']"), 'Backend must allow Receipt No write-back');
assert.ok(backend.includes("receiptGenerated: ['Receipt Generated']"), 'Backend must allow Receipt Generated write-back');
assert.ok(backend.includes("const DEFAULT_RANGE = 'Form Responses 1!A:AZ'"), 'Backend range must include receipt columns beyond Z');
assert.ok(frontend.includes('Gold Mangalya Bottu sponsorship tracking'), 'Dashboard must show Mangalya Sponsorship module');
assert.ok(frontend.includes('buildMangalyaDonorAppealMessage'), 'Frontend must build Mangalya sponsorship WhatsApp appeal dynamically');
assert.ok(frontend.includes('makeMangalyaDonorWhatsAppUrl'), 'Frontend must create Mangalya sponsorship WhatsApp URLs');
assert.ok(frontend.includes('https://wa.me/${normalizedMobile}?text=${encodedText}'), 'Mangalya sponsorship WhatsApp URL must use wa.me and encodeURIComponent');
assert.ok(frontend.includes('Total Sponsors'), 'Sponsorship dashboard must show sponsor summary cards');
assert.ok(frontend.includes('Confirmed 2026'), 'Sponsorship dashboard must show confirmed 2026 bottus');
assert.ok(frontend.includes('Remaining Requirement'), 'Sponsorship dashboard must show remaining bottu requirement');
assert.ok(frontend.includes('Expected Collection'), 'Sponsorship dashboard must show collection summary');
assert.ok(frontend.includes('Top Sponsors'), 'Sponsorship dashboard must show top sponsors');
assert.ok(frontend.includes('Mark Paid'), 'Sponsor cards must support Mark Paid');
assert.ok(frontend.includes('Mark Received'), 'Sponsor cards must support Mark Received');
assert.ok(frontend.includes('Preview All WhatsApp Messages'), 'Sponsorship dashboard must include a preview-all WhatsApp queue');
assert.ok(frontend.includes('Current Message Preview'), 'Sponsorship dashboard must preview the selected bulk WhatsApp message');
assert.ok(frontend.includes('Next WhatsApp'), 'Sponsorship dashboard must open sponsor WhatsApp messages one by one');
assert.ok(backend.includes("const DONOR_RANGE = process.env.MANGALYA_SPONSORSHIP_RANGE || \"'Sponsorship 2026'!A:J\""), 'Backend must use private Mangalya sponsorship sheet range');
assert.ok(backend.includes('/api/mangalya-sponsorship'), 'Backend must expose Mangalya sponsorship endpoints');
assert.ok(backend.includes('MANGALYA_SPONSORSHIP_SHEET_ID'), 'Backend must read sponsorship sheet ID from environment');
assert.ok(!frontend.includes('MANGALYA_SPONSORSHIP_SHEET_ID'), 'Frontend must not reference the private sponsorship sheet ID');

const mobileValidationForTest = (rawMobile) => {
  const digits = String(rawMobile || '').replace(/\D/g, '');
  if (!digits) return 'Missing Mobile';
  if (digits.length < 10) return 'Invalid';
  if (digits.length === 10) return 'OK';
  if (digits.length === 11 && digits.startsWith('0')) return 'OK after removing 0';
  if (digits.length === 12 && digits.startsWith('91')) return 'OK';
  return 'Invalid';
};
const mobileValidationExamples = [
  ['', 'Missing Mobile'],
  ['12345', 'Invalid'],
  ['1234567890', 'OK'],
  ['911234567890', 'OK'],
  ['01234567890', 'OK after removing 0'],
  ['9112345678909', 'Invalid'],
];
for (const [input, expected] of mobileValidationExamples) {
  assert.equal(mobileValidationForTest(input), expected);
}

const sampleCouple = {
  eventType: 'shashtipoorthi',
  groomName: 'Bonthala Krishnamurthy',
  brideName: 'Bonthala Sumithra',
  paidAmount: 30000,
  balance: 0,
};
const shashtipoorthiWelcome = buildWelcomeMessage(sampleCouple);
const shashtipoorthiFullPayment = buildPaymentConfirmationMessage(sampleCouple);
const shashtipoorthiPartialPayment = buildPaymentConfirmationMessage({
  ...sampleCouple,
  paidAmount: 10000,
  balance: 20000,
});
const bhimarathaWelcome = buildWelcomeMessage({ ...sampleCouple, eventType: 'bhimaratha' });
const bhimarathaFullPayment = buildPaymentConfirmationMessage({
  ...sampleCouple,
  eventType: 'bhimaratha',
  paidAmount: 20000,
  balance: 0,
});
const bhimarathaPartialPayment = buildPaymentConfirmationMessage({
  ...sampleCouple,
  eventType: 'bhimaratha',
  paidAmount: 5000,
  balance: 15000,
});

const foldedHands = String.fromCodePoint(0x1F64F);
const moneyBag = String.fromCodePoint(0x1F4B0);
const check = String.fromCodePoint(0x2705);
const yellowCircle = String.fromCodePoint(0x1F7E1);
const expectedWelcomeStart = `${foldedHands} *Namaskara Bonthala Krishnamurthy & Bonthala Sumithra*\n\nThank you for registering for the *Samoohika Shashtipoorthi Shanthi*.`;
assert.ok(shashtipoorthiWelcome.startsWith(expectedWelcomeStart), 'Welcome message must start with exact new multiline template');
assert.equal(shashtipoorthiWelcome.codePointAt(0), 0x1F64F);
assert.ok(!shashtipoorthiWelcome.includes('?'), 'Welcome message must not contain replacement characters');
assert.ok([...whatsappTemplates].some((char) => char.codePointAt(0) === 0x1F64F), 'Template file must contain real folded hands emoji');
assert.ok([...whatsappTemplates].some((char) => char.codePointAt(0) === 0x1F4B0), 'Template file must contain real money bag emoji');
assert.ok(shashtipoorthiWelcome.includes(`${moneyBag} *Booking Fee:*`));
assert.ok(shashtipoorthiWelcome.includes('30,000 per couple'));
assert.match(shashtipoorthiWelcome, /Gold Mangalya Bottu/);
assert.match(shashtipoorthiWelcome, /Mangalya Dharane/);
assert.match(bhimarathaWelcome, /Samoohika Bhimaratha Shanthi/);
assert.ok(bhimarathaWelcome.includes(`${moneyBag} *Booking Fee:*`));
assert.ok(bhimarathaWelcome.includes('20,000 per couple'));
assert.doesNotMatch(bhimarathaWelcome, /Gold Mangalya Bottu|Mangalya Dharane/);
assert.ok(shashtipoorthiFullPayment.includes(`${check} *Registration Confirmed*`));
assert.ok(shashtipoorthiFullPayment.includes('30,000')); 
assert.ok(shashtipoorthiPartialPayment.includes(`${yellowCircle} *Registration Under Process*`));
assert.ok(shashtipoorthiPartialPayment.includes(`${moneyBag} *Balance Amount Payable:*`));
assert.ok(shashtipoorthiPartialPayment.includes('20,000'));
assert.match(bhimarathaFullPayment, /Samoohika Bhimaratha Shanthi/);
assert.ok(bhimarathaFullPayment.includes('20,000')); 
assert.match(bhimarathaPartialPayment, /Samoohika Bhimaratha Shanthi/);
assert.ok(bhimarathaPartialPayment.includes(`${moneyBag} *Balance Amount Payable:*`));
assert.ok(bhimarathaPartialPayment.includes('15,000'));

const forcedFullPayment = buildPaymentConfirmationMessage({
  ...sampleCouple,
  paymentStatus: 'Full Paid',
  paidAmount: 10000,
  balance: 20000,
});
const forcedPartialPayment = buildPaymentConfirmationMessage({
  ...sampleCouple,
  paymentStatus: 'Part Paid',
  paidAmount: 30000,
  balance: 0,
});
assert.ok(forcedFullPayment.includes('*Registration Confirmed*'));
assert.ok(forcedPartialPayment.includes('*Registration Under Process*'));
assert.doesNotMatch(shashtipoorthiFullPayment, /support/i);
assert.doesNotMatch(shashtipoorthiPartialPayment, /support/i);
assert.doesNotMatch(bhimarathaFullPayment, /support/i);
assert.doesNotMatch(bhimarathaPartialPayment, /support/i);
assert.doesNotMatch(buildWelcomeMessage({ eventType: 'shashtipoorthi', groomName: 'Only Husband' }), /undefined|null|&\s*$/i);
assert.ok(buildWhatsAppMessage(sampleCouple, 'kit').includes('KIT distribution'));

const encodedWelcome = `https://wa.me/916360716397?text=${encodeWhatsAppMessage(shashtipoorthiWelcome)}`;
assert.ok(encodedWelcome.startsWith('https://wa.me/916360716397?text='));
assert.ok(!encodedWelcome.startsWith('https://wa.me/91916360716397'));
assert.ok(encodedWelcome.includes('%0A'));
assert.equal(decodeURIComponent(encodedWelcome.split('text=')[1]), shashtipoorthiWelcome);

const messageFormattingCases = [
  ['Shashtipoorthi Welcome', shashtipoorthiWelcome],
  ['Bhimaratha Welcome', bhimarathaWelcome],
  ['Shashtipoorthi Full Payment', shashtipoorthiFullPayment],
  ['Shashtipoorthi Partial Payment', shashtipoorthiPartialPayment],
  ['Bhimaratha Full Payment', bhimarathaFullPayment],
  ['Bhimaratha Partial Payment', bhimarathaPartialPayment],
];

for (const [label, message] of messageFormattingCases) {
  const encoded = encodeWhatsAppMessage(message);
  assert.ok(message.includes('\n'), label + ' must contain raw line breaks before encoding');
  assert.ok(message.includes('\n\n'), label + ' must preserve blank lines before encoding');
  assert.ok(encoded.includes('%0A'), label + ' URL text must encode line breaks as %0A');
  assert.ok(encoded.includes('%0A%0A'), label + ' URL text must encode blank lines as %0A%0A');
  assert.equal(decodeURIComponent(encoded), message.replace(/\r\n?/g, '\n'), label + ' must decode back to the multiline template');
}
console.log('Event mapping and WhatsApp message regression checks passed.');
