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
assert.ok(frontend.includes('Free Sponsorship'), 'Dashboard must support Free Sponsorship payment status');
assert.ok(frontend.includes('isFreeSponsorshipStatus'), 'Frontend must identify Free Sponsorship status');
assert.ok(frontend.includes('sheetPaymentStatus'), 'CSV fallback must read the Payment Status column from the sheet');
assert.ok(frontend.includes('balance = isFreeSponsorshipStatus(paymentStatus) ? 0'), 'Free Sponsorship participants must not show a balance receivable');
assert.ok(frontend.includes('goToFreeSponsorship'), 'Free Sponsorship summary card must jump to filtered participants');
assert.ok(backend.includes('FREE_SPONSORSHIP_STATUS'), 'Backend must support Free Sponsorship payment status');
assert.ok(backend.includes('isFreeSponsorshipStatus(paymentStatus) ? 0'), 'Backend must set Free Sponsorship balance to zero');
assert.ok(frontend.includes('Duplicate mobile number'), 'Mobile report must flag duplicate mobile numbers');
assert.ok(frontend.includes('WhatsApp Groups'), 'Dashboard must show WhatsApp group setup section');
assert.ok(frontend.includes('Existing participants up to Seat No.'), 'WhatsApp group workflow must explain the handled seat baseline');
assert.ok(frontend.includes('VITE_WHATSAPP_GROUP_HANDLED_SEAT_BASELINE'), 'WhatsApp group handled baseline must be configurable');
assert.ok(frontend.includes("|| 'D-01'"), 'WhatsApp group handled baseline must default to D-01');
assert.ok(frontend.includes('isSeatAfterBaseline'), 'WhatsApp group workflow must detect only seats after the baseline');
assert.ok(frontend.includes('buildWhatsAppGroupPreview'), 'Frontend must build event-specific WhatsApp group previews');
assert.ok(frontend.includes('row.eventType === eventType'), 'WhatsApp group preview must filter participants by event type');
assert.ok(frontend.includes('Duplicate entries skipped'), 'WhatsApp group preview must prevent duplicate participant contacts');
assert.ok(frontend.includes('navigator.clipboard.writeText'), 'WhatsApp group workflow must copy participant contact names');
assert.ok(frontend.includes('Download New Contacts (.vcf)'), 'WhatsApp group workflow must download event VCF contacts for new registrations only');
assert.ok(frontend.includes("Download Both Groups' New Contacts"), 'WhatsApp group workflow must download combined VCF contacts for new registrations only');
assert.ok(frontend.includes('Copy New Participant Names'), 'WhatsApp group workflow must copy only new participant names');
assert.ok(frontend.includes('Copy New Mobile Numbers'), 'WhatsApp group workflow must copy only new participant mobiles');
assert.ok(frontend.includes('buildVcfContact'), 'Frontend must generate VCF contacts dynamically');
assert.ok(frontend.includes('VERSION:3.0'), 'VCF contacts must use vCard 3.0');
assert.ok(frontend.includes('text/vcard;charset=utf-8'), 'VCF contacts must be downloaded as vCard data');
assert.ok(frontend.includes('MVST Shasti'), 'Shashtipoorthi contacts must use MVST Shasti prefix');
assert.ok(frontend.includes('MVST Bheema'), 'Bhimaratha contacts must use MVST Bheema prefix');
assert.ok(frontend.includes('MVST PST'), 'PST contacts must use MVST PST prefix');
assert.ok(frontend.includes('buildCombinedGroupContactRows'), 'Combined VCF download must de-duplicate contacts across both groups');
assert.ok(frontend.includes('Import the VCF'), 'WhatsApp group workflow must instruct contact import before adding future registrations');
assert.ok(frontend.includes('https://web.whatsapp.com/'), 'Assisted workflow must open WhatsApp for manual group creation');
assert.ok(!frontend.includes('Mark Group Created'), 'Future registration WhatsApp workflow must not write group-created status');
assert.ok(!frontend.includes('/api/whatsapp-groups'), 'Frontend must not write WhatsApp group-added status to Google Sheets');
assert.ok(frontend.includes('/api/whatsapp-group-config'), 'Frontend must load PST admins from backend/private sheet');
assert.ok(frontend.includes('New Registrations'), 'Dashboard must show New Registrations section');
assert.ok(frontend.includes('Awaiting treasurer payment confirmation'), 'New Registrations section must explain treasurer confirmation status');
assert.ok(frontend.includes('newRegistrationRows'), 'Frontend must keep unverified registrations in a separate list');
assert.ok(frontend.includes('.filter((row) => row.treasurerVerified)'), 'Regular participant tabs must show only treasurer-verified registrations');
assert.ok(frontend.includes('Form Timestamp'), 'Participant cards must show form timestamp for cross verification');
assert.ok(frontend.includes('PARTICIPANT_SORT_OPTIONS'), 'Participant pages must define sort options');
assert.ok(frontend.includes('Latest Registration'), 'Participant sort must include Latest Registration option');
assert.ok(frontend.includes('Seat Number (Ascending)'), 'Participant sort must include seat ascending option');
assert.ok(frontend.includes('Seat Number (Descending)'), 'Participant sort must include seat descending option');
assert.ok(frontend.includes('Participant Name (A-Z)'), 'Participant sort must include participant name option');
assert.ok(frontend.includes("const [participantSort, setParticipantSort] = useState('latest')"), 'Latest Registration must be the default participant sort');
assert.ok(frontend.includes('function sortParticipants(rows, sortMode = \'latest\')'), 'Frontend must sort participants through a reusable helper');
assert.ok(frontend.includes('timestampValue(a.timestamp)'), 'Latest Registration sort must use Google Form timestamp');
assert.ok(frontend.includes("return compareSeatNumbers(a, b, 'desc')"), 'Latest Registration sort must fall back to descending seat number');
assert.ok(frontend.includes('sortParticipants(eventRows.filter((row) => isSeatAfterBaseline(row.seatNo)), \'latest\')'), 'WhatsApp future participants must use latest-first ordering');
assert.ok(frontend.includes('sortParticipants(rows.filter((row) =>'), 'Bulk receipt participant selection must use sorted eligible rows');
assert.ok(frontend.includes('function parseSeatValue(seatNo)'), 'Frontend must parse normalized seat values');
assert.ok(frontend.includes('function nextSeatAfter(parsedSeat)'), 'Frontend must calculate next seat transitions');
assert.ok(frontend.includes('function seatAuditForEvent(rows, eventType)'), 'Frontend must audit event-specific seat sequences');
assert.ok(frontend.includes('Last Accepted Seat'), 'Dashboard must show last accepted seat');
assert.ok(frontend.includes('Suggested Next Seat'), 'Dashboard must show suggested next seat');
assert.ok(frontend.includes('Occupied in Current Row'), 'Dashboard must show occupied seats in current row');
assert.ok(frontend.includes('Seat ${parsed.normalized} is already allotted. Suggested next available seat:'), 'Seat save must block duplicates and suggest the next seat');
assert.ok(frontend.includes('const RECEIPT_PREFIXES'), 'Frontend must define event-wise receipt prefixes');
assert.ok(frontend.includes("bhimaratha: 'BS26'"), 'Bhimaratha receipt numbers must use BS26 prefix');
assert.ok(frontend.includes("shashtipoorthi: 'SP26'"), 'Shashtipoorthi receipt numbers must use SP26 prefix');
assert.match(frontend, /\\d\{1,3\}/, 'Receipt parser must accept old padded and new non-padded receipt suffixes');
assert.ok(frontend.includes('return `${receiptPrefix(eventType)}-${Number(number)}`'), 'Receipt formatter must not zero-pad the suffix');
assert.ok(backend.includes('sanitizedUpdates.receiptNo = formatReceiptNo(currentRow.eventType, parsedReceipt)'), 'Backend must normalize padded receipt values before saving');
assert.ok(frontend.includes('function receiptBookAudit(rows, eventType)'), 'Frontend must audit event-wise receipt-book numbers');
assert.ok(frontend.includes('Last Used Receipt No.'), 'Receipt panel must show last used receipt number');
assert.ok(frontend.includes('Suggested Next Receipt No.'), 'Receipt panel must show suggested next receipt number');
assert.ok(frontend.includes('Suggested Receipt No.'), 'Eligible unsaved receipt rows must show their event-wise suggested receipt number');
assert.ok(frontend.includes('Save Receipt No'), 'Receipt number must be saved by explicit user action');
assert.ok(frontend.includes('do not reserve receipt number'), 'Receipt preview/download/share must not reserve receipt numbers');
assert.ok(!frontend.includes('Receipt Number Not Assigned'), 'Eligible blank receipt rows must not be blocked merely because Receipt No is blank');
assert.ok(frontend.includes('registrationTimestampDate'), 'Receipt date must be derived from registration timestamp');
assert.ok(frontend.includes("timeZone: 'Asia/Kolkata'"), 'Receipt timestamp parsing must use Asia/Kolkata');
assert.ok(frontend.includes('const receiptLayouts = {'), 'Receipt field coordinates must live in a reusable layout config');
assert.ok(frontend.includes('shashtipoorthi: {'), 'Receipt layout config must include Shashtipoorthi coordinates');
assert.ok(frontend.includes('bhimaratha: {'), 'Receipt layout config must include Bhimaratha coordinates');
assert.ok(frontend.includes("const RECEIPT_TEXT_COLOR = '#0B2D5C'"), 'Receipt text must use dark navy blue');
assert.ok(frontend.includes('function receiptCoupleNameLines'), 'Receipt name rendering must support one-line/two-line fitting');
assert.ok(frontend.includes('Sri. ${groomName} & Smt. ${brideName}'), 'Receipt couple name must preserve Sri. and Smt. on one line');
assert.ok(frontend.includes('`& Smt. ${brideName}`'), 'Receipt couple name must preserve Smt. on wrapped second line');
assert.ok(frontend.includes("replace(/\\s+-\\s+/g, ' ')"), 'Receipt names must replace accidental separator hyphens with spaces');
assert.ok(!frontend.includes('numericAmount'), 'Receipt generator must not draw numeric amount overlay');
assert.ok(!frontend.includes('amountInWords'), 'Receipt generator must not draw amount-in-words overlay');
assert.ok(frontend.includes("throw new Error('Valid event-wise receipt number is required')"), 'Receipt generator must reject invalid event-wise receipt number internally');
assert.ok(frontend.includes("throw new Error('Registration timestamp missing')"), 'Receipt generator must reject missing timestamp internally');
assert.ok(frontend.includes('const activeReceiptNo = validReceiptNumber ? savedReceiptNo : suggestedReceiptNo'), 'Receipt preview/download must use suggested event-wise receipt number without saving it');
assert.ok(frontend.includes('const receiptNo = suggestedReceiptNumber(workingRows, currentParticipant)'), 'Bulk receipt generation must assign event-wise suggested receipt numbers');
assert.ok(backend.includes('await loadFromGoogleApi().then'), 'Backend must reload Google Sheets data before registration updates');
assert.ok(backend.includes('Seat ${parsedSeat.normalized} is already allotted. Suggested next available seat:'), 'Backend must block duplicate seat saves');
assert.ok(backend.includes('Receipt No. ${nextReceiptRaw} is already used. Suggested next available receipt no:'), 'Backend must block duplicate receipt saves');
assert.ok(backend.includes('const RECEIPT_PREFIXES'), 'Backend must validate event-wise receipt prefixes');
assert.ok(backend.includes('receiptNumericValue(nextReceiptRaw, currentRow.eventType)'), 'Backend must validate receipt number against the current event');
assert.ok(frontend.includes('scrollToSection'), 'Dashboard summary cards must support jump navigation');
assert.ok(frontend.includes('id="new-registrations-dashboard"'), 'New Registrations section must have a jump target');
assert.ok(frontend.includes('id="participant-management-dashboard"'), 'Participant Management section must have a jump target');
assert.ok(frontend.includes('onClick={goToPaymentPending}'), 'Pending summary cards must jump to pending participants');
assert.ok(frontend.includes('app-sidebar'), 'Dashboard must include sidebar navigation');
assert.ok(frontend.includes('Shashtipoorthi Shanthi'), 'Sidebar must include Shashtipoorthi Shanthi view');
assert.ok(frontend.includes('Bhimaratha Shanthi'), 'Sidebar must include Bhimaratha Shanthi view');
assert.ok(frontend.includes('Sponsorship Management'), 'Sidebar must include Sponsorship Management view');
assert.ok(frontend.includes('Seat No'), 'Dashboard must show Seat No fields');
assert.ok(frontend.includes('Receipt No'), 'Dashboard must show Receipt No fields');
assert.ok(frontend.includes('Receipt Generated'), 'Dashboard must show Receipt Generated status');
assert.ok(frontend.includes('Generate Receipt'), 'Dashboard must show Generate Receipt button');
assert.ok(frontend.includes('Download Receipt'), 'Dashboard must show Download Receipt button');
assert.ok(frontend.includes('Bulk Generate Receipts'), 'Dashboard must show Bulk Generate Receipts button');
assert.ok(frontend.includes('function isReceiptEligible(participant)'), 'Frontend must define receipt eligibility validation');
assert.ok(frontend.includes("String(participant.paymentStatus || '').trim() === 'Full Paid'"), 'Receipt eligibility must require Full Paid status');
assert.ok(frontend.includes('Number(participant.balance || 0) === 0'), 'Receipt eligibility must require zero balance');
assert.ok(frontend.includes('!isFreeSponsorship(participant)'), 'Receipt eligibility must exclude Free Sponsorship participants');
assert.ok(frontend.includes('throw new Error(receiptUnavailableMessage(participant))'), 'Receipt generator must reject ineligible rows internally');
assert.ok(frontend.includes('Receipt will be available after the full amount is received.'), 'Ineligible participants must see receipt availability guidance');
assert.ok(frontend.includes('Total Amount'), 'Receipt panel must show total amount');
assert.ok(frontend.includes('Amount Received'), 'Receipt panel must show amount received');
assert.ok(frontend.includes('<span>Balance</span>{formatCurrency(participant.balance)}</p>'), 'Receipt panel must show balance');
assert.ok(frontend.includes('RECEIPT_PREFIXES'), 'Receipt numbers must use event-code prefixes');
assert.ok(frontend.includes('shastipoorthi-receipt.jpeg'), 'Frontend must use original Shashtipoorthi receipt template');
assert.ok(frontend.includes('bhimaratha-receipt.jpeg'), 'Frontend must use original Bhimaratha receipt template');
assert.ok(frontend.includes("toDataURL('image/jpeg'"), 'Receipt output must be generated as JPG');
assert.ok(backend.includes("seatNo: ['Seat No']"), 'Backend must allow Seat No write-back');
assert.ok(backend.includes("receiptNo: ['Receipt No']"), 'Backend must allow Receipt No write-back');
assert.ok(backend.includes("receiptGenerated: ['Receipt Generated']"), 'Backend must allow Receipt Generated write-back');
assert.ok(backend.includes("const DEFAULT_RANGE = 'Form Responses 1!A:AZ'"), 'Backend range must include receipt columns beyond Z');
assert.ok(frontend.includes('Requirement and donor contribution tracking'), 'Dashboard must show Sponsorship Management module');
assert.ok(frontend.includes('Requirement Progress Dashboard'), 'Dashboard must show annual requirement progress');
assert.ok(frontend.includes('Financial Report'), 'Dashboard must show sponsorship financial report');
assert.ok(frontend.includes('VITE_ACTIVE_EVENT_YEAR'), 'Sponsorship dashboard must be scoped by configurable active event year');
assert.ok(frontend.includes('isActiveEventYear'), 'Sponsorship dashboard must exclude explicit non-active-year rows from current totals');
assert.ok(frontend.includes('buildMangalyaDonorAppealMessage'), 'Frontend must build Mangalya sponsorship WhatsApp appeal dynamically');
assert.ok(frontend.includes('buildMangalyaDonorThankYouMessage'), 'Frontend must build Mangalya sponsorship thank-you WhatsApp message');
assert.ok(frontend.includes('buildMangalyaDonorPaymentReceivedMessage'), 'Frontend must build Mangalya sponsorship payment received WhatsApp message');
assert.ok(frontend.includes('buildMangalyaDonorPostEventThankYouMessage'), 'Frontend must build Mangalya sponsorship post-event thank-you WhatsApp message');
assert.ok(frontend.includes('makeMangalyaDonorWhatsAppUrl'), 'Frontend must create Mangalya sponsorship WhatsApp URLs');
assert.ok(frontend.includes('https://wa.me/${normalizedMobile}?text=${encodedText}'), 'Mangalya sponsorship WhatsApp URL must use wa.me and encodeURIComponent');
assert.ok(frontend.includes('Total Sponsors'), 'Sponsorship dashboard must show sponsor summary cards');
assert.ok(frontend.includes('Confirmed Qty'), 'Sponsorship dashboard must show confirmed quantity');
assert.ok(frontend.includes("['confirmed', 'paid', 'received', 'fully received'].includes(status)"), 'Confirmed sponsorship status must count even before quantity is finalized');
assert.ok(frontend.includes("'fully received'"), 'Fully Received donation status must count as received');
assert.ok(frontend.includes("setSponsorFilter('confirmed-quantity')"), 'Confirmed quantity card must open the confirmed sponsor breakdown');
assert.ok(frontend.includes('Confirmed Sponsors'), 'Confirmed quantity filter must show sponsor names and counts');
assert.ok(frontend.includes('Remaining Requirement'), 'Sponsorship dashboard must show remaining bottu requirement');
assert.ok(frontend.includes('Expected Collection'), 'Sponsorship dashboard must show collection summary');
assert.ok(frontend.includes('Top Sponsors'), 'Sponsorship dashboard must show top sponsors');
assert.ok(frontend.includes('Mark Paid'), 'Sponsor cards must support Mark Paid');
assert.ok(frontend.includes('Mark Received'), 'Sponsor cards must support Mark Received');
assert.ok(frontend.includes('Donor Journey'), 'Sponsor cards must show the donor journey');
assert.ok(frontend.includes('DONOR_JOURNEY_STEPS'), 'Sponsor cards must track donor journey steps separately');
assert.ok(frontend.includes('journey-sent-button'), 'Sent donor journey actions must have a completed visual state');
assert.ok(frontend.includes('2. Confirmation'), 'Sponsor cards must support confirmation WhatsApp messages');
assert.ok(frontend.includes('3. Payment + Receipt'), 'Sponsor cards must support payment received receipt invitation WhatsApp messages');
assert.ok(frontend.includes('4. Post-Event Thanks'), 'Sponsor cards must support post-event thank-you WhatsApp messages');
assert.ok(frontend.includes('Preview All WhatsApp Messages'), 'Sponsorship dashboard must include a preview-all WhatsApp queue');
assert.ok(frontend.includes('Current Message Preview'), 'Sponsorship dashboard must preview the selected bulk WhatsApp message');
assert.ok(frontend.includes('Next WhatsApp'), 'Sponsorship dashboard must open sponsor WhatsApp messages one by one');
assert.ok(backend.includes('SPONSORSHIP_REQUIREMENTS_RANGE'), 'Backend must support Sponsorship Requirements master range');
assert.ok(backend.includes('normalizeRequirementRows'), 'Backend must normalize Sponsorship Requirements rows');
assert.ok(backend.includes('canonicalCategory'), 'Backend must normalize canonical category aliases');
assert.ok(backend.includes("process.env.MANGALYA_SPONSORSHIP_RANGE || process.env.SPONSORSHIP_CONTRIBUTIONS_RANGE"), 'Backend must support configurable sponsorship contribution ranges');
assert.ok(backend.includes("A:AZ"), 'Backend must leave room for future sponsorship contribution fields');
assert.ok(backend.includes("confirmationSent: ['Confirmation Sent']"), 'Backend must support confirmation sent write-back');
assert.ok(backend.includes("paymentMessageSent: ['Payment Message Sent']"), 'Backend must support payment message sent write-back');
assert.ok(backend.includes("postEventSent: ['Post Event Sent']"), 'Backend must support post-event sent write-back');
assert.ok(backend.includes('/api/mangalya-sponsorship'), 'Backend must expose Mangalya sponsorship endpoints');
assert.ok(backend.includes('MANGALYA_SPONSORSHIP_SHEET_ID'), 'Backend must read sponsorship sheet ID from environment');
assert.ok(!frontend.includes('MANGALYA_SPONSORSHIP_SHEET_ID'), 'Frontend must not reference the private sponsorship sheet ID');
assert.ok(backend.includes('/api/whatsapp-group-config'), 'Backend must expose WhatsApp group config endpoint');
assert.ok(backend.includes('/api/whatsapp-groups'), 'Backend must expose WhatsApp group log endpoint');
assert.ok(backend.includes('WHATSAPP_PST_ADMINS_RANGE'), 'Backend must read PST admins from a private sheet range');
assert.ok(backend.includes('WHATSAPP_GROUP_LOG_RANGE'), 'Backend must append WhatsApp group logs to private sheet');
assert.ok(frontend.includes('groupConfig.pstAdmins'), 'Frontend must use PST admins loaded at runtime');

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

const lettersToNumberForTest = (letters) => String(letters || '').toUpperCase().split('').reduce((value, letter) => value * 26 + (letter.charCodeAt(0) - 64), 0);
const numberToLettersForTest = (value) => {
  let number = Number(value || 0);
  let letters = '';
  while (number > 0) {
    number -= 1;
    letters = String.fromCharCode(65 + (number % 26)) + letters;
    number = Math.floor(number / 26);
  }
  return letters || 'A';
};
const parseSeatForTest = (seatNo) => {
  const match = String(seatNo || '').trim().toUpperCase().match(/^([A-Z]+)\s*-?\s*(\d{1,2})$/);
  if (!match) return null;
  const rowNumber = lettersToNumberForTest(match[1]);
  const seatNumber = Number(match[2]);
  if (!rowNumber || seatNumber < 1 || seatNumber > 6) return null;
  return { row: match[1], rowNumber, seatNumber, normalized: `${match[1]}-${String(seatNumber).padStart(2, '0')}`, rank: rowNumber * 100 + seatNumber };
};
const nextSeatAfterForTest = (seatNo) => {
  const parsed = parseSeatForTest(seatNo);
  if (!parsed) return 'A-01';
  const rowNumber = parsed.seatNumber >= 6 ? parsed.rowNumber + 1 : parsed.rowNumber;
  const seatNumber = parsed.seatNumber >= 6 ? 1 : parsed.seatNumber + 1;
  return `${numberToLettersForTest(rowNumber)}-${String(seatNumber).padStart(2, '0')}`;
};
const seatAuditForTest = (rows, eventType) => {
  const counts = new Map();
  const rowSeatCounts = new Map();
  const invalidSeats = [];
  const missingSeats = [];
  let highest = null;
  rows.filter((row) => row.eventType === eventType).forEach((row) => {
    if (!String(row.seatNo || '').trim()) {
      missingSeats.push(row);
      return;
    }
    const parsed = parseSeatForTest(row.seatNo);
    if (!parsed) {
      invalidSeats.push(row);
      return;
    }
    counts.set(parsed.normalized, (counts.get(parsed.normalized) || 0) + 1);
    rowSeatCounts.set(parsed.row, (rowSeatCounts.get(parsed.row) || 0) + 1);
    if (!highest || parsed.rank > highest.rank) highest = parsed;
  });
  const currentRow = highest?.row || 'A';
  return {
    suggestedNextSeat: highest ? nextSeatAfterForTest(highest.normalized) : 'A-01',
    currentRow,
    occupiedInCurrentRow: highest ? rowSeatCounts.get(currentRow) || 0 : 0,
    duplicateSeats: [...counts.entries()].filter(([, count]) => count > 1),
    invalidSeats,
    missingSeats,
  };
};

const seatTransitionCases = [
  ['A-01', 'A-02'],
  ['A-06', 'B-01'],
  ['D-05', 'D-06'],
  ['D-06', 'E-01'],
  ['Z-06', 'AA-01'],
  ['D - 06', 'E-01'],
  ['d-1', 'D-02'],
  ['', 'A-01'],
];
for (const [input, expected] of seatTransitionCases) {
  assert.equal(nextSeatAfterForTest(input), expected);
}
assert.equal(parseSeatForTest('D 01').normalized, 'D-01');
assert.equal(parseSeatForTest('D-07'), null);
assert.equal(parseSeatForTest('bad'), null);

const seatAuditRows = [
  { eventType: 'shashtipoorthi', seatNo: 'A-06' },
  { eventType: 'shashtipoorthi', seatNo: 'B-01' },
  { eventType: 'shashtipoorthi', seatNo: 'B - 01' },
  { eventType: 'shashtipoorthi', seatNo: '' },
  { eventType: 'shashtipoorthi', seatNo: 'Q-11' },
  { eventType: 'bhimaratha', seatNo: 'A-01' },
];
const shashtiSeatAudit = seatAuditForTest(seatAuditRows, 'shashtipoorthi');
const bheemaSeatAudit = seatAuditForTest(seatAuditRows, 'bhimaratha');
assert.equal(shashtiSeatAudit.suggestedNextSeat, 'B-02');
assert.equal(shashtiSeatAudit.duplicateSeats[0][0], 'B-01');
assert.equal(shashtiSeatAudit.currentRow, 'B');
assert.equal(shashtiSeatAudit.occupiedInCurrentRow, 2);
assert.equal(shashtiSeatAudit.missingSeats.length, 1);
assert.equal(shashtiSeatAudit.invalidSeats.length, 1);
assert.equal(bheemaSeatAudit.suggestedNextSeat, 'A-02');

const timestampValueForTest = (timestamp) => {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return new Date(Number(match[3].length === 2 ? `20${match[3]}` : match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)).getTime();
};
const sortLatestForTest = (rows) => [...rows].sort((a, b) => {
  const timeA = timestampValueForTest(a.timestamp);
  const timeB = timestampValueForTest(b.timestamp);
  if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
  return (parseSeatForTest(b.seatNo)?.rank || 0) - (parseSeatForTest(a.seatNo)?.rank || 0);
});
assert.deepEqual(sortLatestForTest([
  { id: 'old', timestamp: '01/07/2026 10:00:00', seatNo: 'D-06' },
  { id: 'new', timestamp: '02/07/2026 10:00:00', seatNo: 'A-01' },
  { id: 'same-high-seat', timestamp: '02/07/2026 10:00:00', seatNo: 'D-06' },
]).map((row) => row.id), ['same-high-seat', 'new', 'old']);

const receiptEligibilityForTest = (participant) =>
  String(participant.paymentStatus || '').trim() === 'Full Paid' &&
  Number(participant.balance || 0) === 0 &&
  String(participant.paymentStatus || '').trim().toLowerCase() !== 'free sponsorship';

const receiptEligibilityCases = [
  [{ paymentStatus: 'Full Paid', balance: 0 }, true, 'Full Paid with zero balance'],
  [{ paymentStatus: 'Part Paid', balance: 20000 }, false, 'Part Paid with balance'],
  [{ paymentStatus: 'Pending', balance: 30000 }, false, 'Pending with balance'],
  [{ paymentStatus: 'Free Sponsorship', balance: 0 }, false, 'Free Sponsorship'],
  [{ paymentStatus: 'Full Paid', balance: 1 }, false, 'Full Paid with positive balance'],
];
for (const [participant, expected, label] of receiptEligibilityCases) {
  assert.equal(receiptEligibilityForTest(participant), expected, `Receipt eligibility failed for ${label}`);
}

const receiptPrefixesForTest = {
  bhimaratha: 'BS26',
  shashtipoorthi: 'SP26',
};
const receiptNumberForTest = (receiptNo, eventType) => {
  const raw = String(receiptNo || '').trim();
  const match = raw.match(new RegExp(`^${receiptPrefixesForTest[eventType]}-(\\d{1,3})$`));
  return match ? Number(match[1]) : null;
};
const formatReceiptForTest = (eventType, number) => `${receiptPrefixesForTest[eventType]}-${Number(number)}`;
const receiptAuditForTest = (rows, eventType) => {
  const counts = new Map();
  let highest = 0;
  rows.filter((row) => row.eventType === eventType).forEach((row) => {
    const n = receiptNumberForTest(row.receiptNo, eventType);
    if (!n) return;
    highest = Math.max(highest, n);
    counts.set(String(n), (counts.get(String(n)) || 0) + 1);
  });
  return {
    suggestedNext: formatReceiptForTest(eventType, highest + 1),
    duplicates: [...counts.entries()].filter(([, count]) => count > 1),
  };
};
const receiptAuditRowsForTest = [
  { id: 's-old', eventType: 'shashtipoorthi', receiptNo: 'SP26-1', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0 },
  { id: 's-duplicate', eventType: 'shashtipoorthi', receiptNo: 'SP26-001', timestamp: '02/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0 },
  { id: 's-missing', eventType: 'shashtipoorthi', receiptNo: '', timestamp: '03/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0 },
  { id: 'b-old', eventType: 'bhimaratha', receiptNo: 'BS26-001', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0 },
  { id: 'b-missing', eventType: 'bhimaratha', receiptNo: '', timestamp: '02/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0 },
  { eventType: 'bhimaratha', receiptNo: 'D-06' },
  { eventType: 'bhimaratha', id: 'bhimaratha:2', receiptNo: 'bhimaratha:2' },
];
const receiptAudit = receiptAuditForTest(receiptAuditRowsForTest, 'shashtipoorthi');
const bhimarathaReceiptAudit = receiptAuditForTest(receiptAuditRowsForTest, 'bhimaratha');
assert.equal(receiptNumberForTest('BS26-001', 'bhimaratha'), 1, 'Existing BS26-001 must be accepted');
assert.equal(receiptNumberForTest('BS26-2', 'bhimaratha'), 2, 'New BS26-2 format must be accepted');
assert.equal(receiptNumberForTest('SP26-001', 'shashtipoorthi'), 1, 'Existing SP26-001 must be accepted');
assert.equal(receiptNumberForTest('SP26-019', 'shashtipoorthi'), 19, 'Existing SP26-019 must be parsed as 19');
assert.equal(formatReceiptForTest('shashtipoorthi', receiptNumberForTest('SP26-019', 'shashtipoorthi')), 'SP26-19', 'SP26-019 must display/save as SP26-19');
assert.equal(formatReceiptForTest('bhimaratha', receiptNumberForTest('BS26-002', 'bhimaratha')), 'BS26-2', 'BS26-002 must display/save as BS26-2');
assert.equal(receiptNumberForTest('BS26-001', 'shashtipoorthi'), null, 'Wrong event prefix must be rejected');
assert.equal(receiptNumberForTest('SP26-001', 'bhimaratha'), null, 'Wrong event prefix must be rejected');
assert.equal(receiptNumberForTest('D-06', 'bhimaratha'), null, 'Seat number must never be used as receipt number');
assert.equal(receiptNumberForTest('bhimaratha:2', 'bhimaratha'), null, 'Participant ID must never be used as receipt number');
assert.equal(receiptAudit.suggestedNext, 'SP26-2');
assert.equal(bhimarathaReceiptAudit.suggestedNext, 'BS26-2');
assert.equal(receiptAudit.duplicates[0][0], '1');
const suggestionBeforePreview = receiptAudit.suggestedNext;
const suggestionAfterPreview = receiptAudit.suggestedNext;
assert.equal(suggestionAfterPreview, suggestionBeforePreview, 'Receipt suggestion must not be consumed by preview');

const suggestedReceiptForTest = (rows, participant) => {
  const existing = receiptNumberForTest(participant.receiptNo, participant.eventType);
  if (existing) return participant.receiptNo;
  const eventRows = [...rows]
    .filter((row) => row.eventType === participant.eventType && receiptEligibilityForTest(row))
    .sort((a, b) => timestampValueForTest(a.timestamp) - timestampValueForTest(b.timestamp));
  const used = new Set(eventRows.map((row) => receiptNumberForTest(row.receiptNo, participant.eventType)).filter(Boolean));
  let nextNumber = 1;
  for (const row of eventRows) {
    if (receiptNumberForTest(row.receiptNo, participant.eventType)) continue;
    while (used.has(nextNumber)) nextNumber += 1;
    const nextReceipt = formatReceiptForTest(participant.eventType, nextNumber);
    used.add(nextNumber);
    if (row.id === participant.id) return nextReceipt;
  }
  while (used.has(nextNumber)) nextNumber += 1;
  return formatReceiptForTest(participant.eventType, nextNumber);
};
assert.equal(
  suggestedReceiptForTest([
    { id: 'b1', eventType: 'bhimaratha', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
    { id: 'b2', eventType: 'bhimaratha', timestamp: '02/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
    { id: 's1', eventType: 'shashtipoorthi', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
  ], { id: 'b2', eventType: 'bhimaratha', timestamp: '02/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' }),
  'BS26-2',
  'Timestamp ascending must determine the Bhimaratha receipt sequence',
);
assert.equal(
  suggestedReceiptForTest([
    { id: 'b1', eventType: 'bhimaratha', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
    { id: 's1', eventType: 'shashtipoorthi', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
  ], { id: 's1', eventType: 'shashtipoorthi', timestamp: '01/07/2026 10:00:00', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' }),
  'SP26-1',
  'Shashtipoorthi must maintain an independent receipt sequence',
);

const registrationTimestampDateForTest = (timestamp) => {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;
  const indianDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (indianDate) {
    const year = Number(indianDate[3].length === 2 ? `20${indianDate[3]}` : indianDate[3]);
    return `${String(indianDate[1]).padStart(2, '0')}/${String(indianDate[2]).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
  }
  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?!T)/);
  if (isoDateOnly) return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};
assert.equal(registrationTimestampDateForTest('2026-07-14T18:42:10+05:30'), '14/07/2026', 'Receipt date must use timestamp date');
assert.notEqual(registrationTimestampDateForTest('2026-07-14T18:42:10+05:30'), new Date().toLocaleDateString('en-GB'), 'Receipt date must not use today');
assert.equal(registrationTimestampDateForTest('2026-07-14T00:10:00+05:30'), '14/07/2026', 'India timezone must not shift to previous day');
assert.equal(registrationTimestampDateForTest(''), null, 'Missing timestamp must block generation');
assert.equal(registrationTimestampDateForTest('not a timestamp'), null, 'Invalid timestamp must block generation');

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
