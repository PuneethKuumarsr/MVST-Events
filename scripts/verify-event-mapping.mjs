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
