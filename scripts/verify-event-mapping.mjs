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
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const mongoConnection = readFileSync(new URL('../server/db/mongo.js', import.meta.url), 'utf8');
const userModel = readFileSync(new URL('../server/models/User.js', import.meta.url), 'utf8');
const sessionModel = readFileSync(new URL('../server/models/Session.js', import.meta.url), 'utf8');
const qrTokenModel = readFileSync(new URL('../server/models/QrToken.js', import.meta.url), 'utf8');
const distributionLogModel = readFileSync(new URL('../server/models/DistributionLog.js', import.meta.url), 'utf8');

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
assert.ok(frontend.includes('function BalanceReceivableModal'), 'Balance Receivable card must open a detailed modal');
assert.ok(frontend.includes('label="Balance receivable" value={formatCurrency(summary.balance)} tone="warning" onClick={() => setBalanceModalOpen(true)}'), 'Balance Receivable summary card must be clickable');
assert.ok(frontend.includes('Number(row.balance || 0) > 0'), 'Balance modal must include only positive balances');
assert.ok(frontend.includes('!isFreeSponsorship(row)'), 'Balance modal must exclude Free Sponsorship rows');
assert.ok(frontend.includes('Number(b.balance || 0) - Number(a.balance || 0)'), 'Balance modal must sort highest balance first');
assert.ok(frontend.includes('const visibleTotal = visibleRows.reduce((sum, row) => sum + Number(row.balance || 0), 0)'), 'Balance modal total must sum the displayed rows');
assert.ok(frontend.includes('Send Balance WhatsApp'), 'Balance modal must include balance WhatsApp action');
assert.ok(frontend.includes("makeWhatsAppUrl(participant, 'balance')"), 'Balance modal WhatsApp action must use approved balance reminder template');
assert.ok(frontend.includes('function buildBalanceReminderMessage'), 'Balance reminders must use a dedicated approved template');
assert.ok(frontend.includes('Valid mobile required'), 'Balance modal must show invalid-mobile guidance');
assert.ok(frontend.includes("['Part Paid', 'Pending'].includes(participant.paymentStatus)"), 'Balance WhatsApp action must be limited to Part Paid and Pending');
assert.ok(frontend.includes('!isFreeSponsorship(participant)'), 'Balance WhatsApp action must exclude Free Sponsorship participants');
assert.ok(frontend.includes('Edit Payment'), 'Balance modal must include Edit Payment action');
assert.ok(frontend.includes('BALANCE_FILTERS'), 'Balance modal must provide filters');
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
assert.ok(frontend.includes('rows.filter((row) => row.eventType === participant.eventType)'), 'Receipt number suggestions must follow all event registrations, not only paid rows');
assert.ok(frontend.includes('const receiptNo = suggestedReceiptNumber(rows, participant)'), 'Bulk receipt generation must assign event-wise suggested receipt numbers from all event registrations');
assert.ok(backend.includes('await loadFromGoogleApi().then'), 'Backend must reload Google Sheets data before registration updates');
assert.ok(backend.includes('Seat ${parsedSeat.normalized} is already allotted. Suggested next available seat:'), 'Backend must block duplicate seat saves');
assert.ok(backend.includes('Receipt No. ${nextReceiptRaw} is already used. Suggested next available receipt no:'), 'Backend must block duplicate receipt saves');
assert.ok(backend.includes('const RECEIPT_PREFIXES'), 'Backend must validate event-wise receipt prefixes');
assert.ok(backend.includes('receiptNumericValue(nextReceiptRaw, currentRow.eventType)'), 'Backend must validate receipt number against the current event');
assert.ok(!backend.includes('Receipt number can be saved only for Full Paid participants with zero balance.'), 'Backend must allow receipt-number reservation before full payment');
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
assert.ok(frontend.includes('Bulk Generate Receipts ZIP'), 'Dashboard must show Bulk Generate Receipts ZIP button');
assert.ok(frontend.includes('Receipt WhatsApp Queue'), 'Dashboard must provide one-by-one receipt WhatsApp queue');
assert.ok(frontend.includes('Shashtipoorthi Receipts'), 'Receipt WhatsApp queue must have Shashtipoorthi event action');
assert.ok(frontend.includes('Bheemaratha Receipts'), 'Receipt WhatsApp queue must have Bheemaratha event action');
assert.ok(frontend.includes("import JSZip from 'jszip'"), 'Bulk receipt generation must use a client-side ZIP library');
assert.ok(frontend.includes('function dataUrlToBlob(dataUrl)'), 'Bulk ZIP generation must convert receipt data URLs to blobs');
assert.ok(frontend.includes('function isBulkZipSupported()'), 'Bulk ZIP generation must detect unsupported mobile browsers');
assert.ok(frontend.includes('Bulk ZIP download is available on desktop. Use Receipt WhatsApp Queue on mobile.'), 'Mobile browsers must see desktop ZIP guidance instead of Load failed');
assert.ok(frontend.includes('buildReceiptSendQueue'), 'Receipt WhatsApp queue must build an event-specific eligible participant list');
assert.ok(frontend.includes('Confirm & Start'), 'Receipt WhatsApp queue must require confirmation before opening WhatsApp');
assert.ok(frontend.includes('Receipt Sent'), 'Receipt WhatsApp queue must save only after explicit Receipt Sent confirmation');
assert.ok(frontend.includes('Skip'), 'Receipt WhatsApp queue must allow skipping without saving');
assert.ok(frontend.includes('Cancel Queue'), 'Receipt WhatsApp queue must allow cancellation without saving');
assert.ok(frontend.includes('Attach the downloaded receipt JPG and send it manually'), 'Receipt WhatsApp queue must explain manual JPG attachment');
assert.ok(frontend.includes('Sent this session'), 'Receipt WhatsApp queue must show session sent progress');
assert.ok(frontend.includes('Skipped this session'), 'Receipt WhatsApp queue must show session skipped progress');
assert.ok(frontend.includes('Duplicate mobile number skipped'), 'Receipt WhatsApp queue must skip duplicate mobile numbers');
assert.ok(frontend.includes('setReceiptQueueSkippedIds'), 'Receipt WhatsApp queue must keep skipped participants session-local');
assert.ok(backend.includes('suggestedReceiptNoForRow'), 'Backend must enforce timestamp-based receipt sequence before saving');
assert.ok(backend.includes('Receipt No. must follow timestamp order'), 'Backend must reject out-of-sequence receipt numbers');
assert.ok(backend.includes('rows.filter((row) => row.eventType === currentRow.eventType)'), 'Backend receipt sequence must follow all event registrations, not only paid rows');
assert.ok(frontend.includes('const receiptNo = suggestedReceiptNumber(rowsOverride, item.participant)'), 'Receipt queue must use all event registrations for receipt numbers, not only eligible queue members');
const openReceiptQueueBody = frontend.slice(
  frontend.indexOf('async function openReceiptQueueItem'),
  frontend.indexOf('function confirmReceiptSendQueue'),
);
assert.ok(openReceiptQueueBody.includes('generateReceiptJpg'), 'Opening receipt queue item must generate the JPG');
assert.ok(openReceiptQueueBody.includes('downloadReceipt'), 'Opening receipt queue item must download the JPG');
assert.ok(openReceiptQueueBody.includes('window.open(`https://web.whatsapp.com/send?phone='), 'Opening receipt queue item must open WhatsApp Web');
assert.ok(!openReceiptQueueBody.includes('saveRegistration'), 'Opening/downloading WhatsApp receipt must not save or consume Receipt No');
const markReceiptSentBody = frontend.slice(
  frontend.indexOf('async function markReceiptQueueItemSent'),
  frontend.indexOf('function skipReceiptQueueItem'),
);
assert.ok(markReceiptSentBody.includes('await saveRegistration(item.participant.id, { receiptNo })'), 'Receipt Sent must save Receipt No after confirmation');
assert.ok(!markReceiptSentBody.includes('receiptGenerated'), 'Receipt queue must not write Receipt Generated status');
const bulkReceiptBody = frontend.slice(
  frontend.indexOf('async function generateBulkReceipts'),
  frontend.indexOf('return (', frontend.indexOf('async function generateBulkReceipts')),
);
assert.ok(bulkReceiptBody.includes("zip.generateAsync({ type: 'blob' })"), 'Bulk receipt generation must produce one ZIP blob');
assert.ok(bulkReceiptBody.includes('downloadBlob(zipBlob, receiptZipFileName(activeEvent))'), 'Bulk receipt generation must trigger only one ZIP download');
assert.ok(!bulkReceiptBody.includes('saveRegistration'), 'Bulk receipt generation must not save Receipt No or any Sheet state');
assert.ok(!bulkReceiptBody.includes('receiptGenerated'), 'Bulk receipt generation must not write Receipt Generated status');
assert.ok(bulkReceiptBody.includes('failures.push'), 'Bulk receipt generation must continue after one receipt fails');
assert.ok(bulkReceiptBody.includes('Prepared: ${preparedCount}. Failed: ${failures.length}'), 'Bulk receipt generation must report prepared and failed counts');
assert.ok(frontend.includes('function isReceiptEligible(participant)'), 'Frontend must define receipt eligibility validation');
assert.ok(frontend.includes("String(participant.paymentStatus || '').trim() === 'Full Paid'"), 'Receipt eligibility must require Full Paid status');
assert.ok(frontend.includes('Number(participant.balance || 0) === 0'), 'Receipt eligibility must require zero balance');
assert.ok(frontend.includes('!isFreeSponsorship(participant)'), 'Receipt eligibility must exclude Free Sponsorship participants');
assert.ok(frontend.includes('throw new Error(receiptUnavailableMessage(participant))'), 'Receipt generator must reject ineligible rows internally');
assert.ok(frontend.includes('Receipt will be generated after full payment is received.'), 'Ineligible participants must see receipt generation guidance');
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

const balanceRowsForTest = [
  { id: 'part-paid', eventType: 'shashtipoorthi', paymentStatus: 'Part Paid', contribution: 30000, paidAmount: 10000, balance: 20000, timestamp: '7/10/2026 10:00:00' },
  { id: 'pending', eventType: 'bhimaratha', paymentStatus: 'Pending', contribution: 20000, paidAmount: 0, balance: 20000, timestamp: '7/11/2026 10:00:00' },
  { id: 'full-paid', eventType: 'bhimaratha', paymentStatus: 'Full Paid', contribution: 20000, paidAmount: 20000, balance: 0, timestamp: '7/12/2026 10:00:00' },
  { id: 'free', eventType: 'shashtipoorthi', paymentStatus: 'Free Sponsorship', contribution: 30000, paidAmount: 0, balance: 0, timestamp: '7/13/2026 10:00:00' },
];
const balanceListForTest = [...balanceRowsForTest]
  .filter((row) => Number(row.balance || 0) > 0)
  .filter((row) => String(row.paymentStatus || '').toLowerCase() !== 'free sponsorship')
  .sort((a, b) => {
    const balanceDifference = Number(b.balance || 0) - Number(a.balance || 0);
    if (balanceDifference !== 0) return balanceDifference;
    return timestampValueForTest(b.timestamp) - timestampValueForTest(a.timestamp);
  });
assert.deepEqual(balanceListForTest.map((row) => row.id), ['pending', 'part-paid'], 'Balance modal must include Part Paid/Pending and sort by balance then newest timestamp');
assert.equal(balanceListForTest.reduce((sum, row) => sum + Number(row.balance || 0), 0), 40000, 'Balance modal total must equal the dashboard balance total');
const formatCurrencyForBalanceTest = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value || 0);
const eventDisplayForBalanceTest = (eventType) => eventType === 'shashtipoorthi'
  ? 'Samoohika Shashtipoorthi Shanthi'
  : 'Samoohika Bhimaratha Shanthi';
const participantNameForBalanceTest = (participant) => [participant.groomName, participant.brideName].filter(Boolean).join(' & ');
const buildBalanceReminderMessageForTest = (participant) => `🙏 Jai Vasavi 🙏
Dear ${participantNameForBalanceTest(participant)},
Thank you for registering for the ${eventDisplayForBalanceTest(participant.eventType)}.
Our records show:
Total Sponsorship Amount: ${formatCurrencyForBalanceTest(participant.contribution)}
Amount Received: ${formatCurrencyForBalanceTest(participant.paidAmount)}
Balance Payable: ${formatCurrencyForBalanceTest(participant.balance)}
We kindly request you to clear the above balance on or before the Kit Distribution Meeting on 19-07-2026.
On receipt of the full payment, your seat confirmation, receipt, and kit collection formalities will be completed.
For any clarification, please contact us.
Thank you.
🙏 Jai Vasavi 🙏
Mane Manege Vasavi Seva Trust (R.), Bengaluru`;
const balanceMessageParticipant = {
  id: 'shashtipoorthi:19',
  qrToken: 'mvstqr:v1:not-for-message',
  eventType: 'shashtipoorthi',
  groomName: 'Sample Groom',
  brideName: 'Sample Bride',
  contribution: 30000,
  paidAmount: 10000,
  balance: 20000,
  paymentStatus: 'Part Paid',
  seatNo: 'D-04',
  receiptNo: 'SP26-19',
};
const balanceReminder = buildBalanceReminderMessageForTest(balanceMessageParticipant);
assert.ok(balanceReminder.includes('Dear Sample Groom & Sample Bride,'), 'Balance reminder must include participant name');
assert.ok(balanceReminder.includes('Samoohika Shashtipoorthi Shanthi'), 'Balance reminder must include event name');
assert.ok(balanceReminder.includes('Total Sponsorship Amount: ₹30,000'), 'Balance reminder must format total amount');
assert.ok(balanceReminder.includes('Amount Received: ₹10,000'), 'Balance reminder must format received amount');
assert.ok(balanceReminder.includes('Balance Payable: ₹20,000'), 'Balance reminder must format balance amount');
assert.ok(balanceReminder.includes('seat confirmation, receipt, and kit collection formalities'), 'Balance reminder must defer seat/receipt/kit formalities until full payment');
assert.ok(!balanceReminder.includes('D-04'), 'Balance reminder must not disclose seat number');
assert.ok(!balanceReminder.includes('SP26-19'), 'Balance reminder must not disclose receipt number');
assert.ok(!balanceReminder.includes('shashtipoorthi:19'), 'Balance reminder must not disclose internal registration id');
assert.ok(!balanceReminder.includes('mvstqr'), 'Balance reminder must not disclose QR token');
const balanceActionEligibleForTest = (participant, mobileStatus = 'ok') =>
  Number(participant.balance || 0) > 0 &&
  ['Part Paid', 'Pending'].includes(participant.paymentStatus) &&
  participant.paymentStatus !== 'Free Sponsorship' &&
  mobileStatus === 'ok';
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Part Paid', balance: 20000 }, 'ok'), true, 'Part Paid participant must get balance action');
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Pending', balance: 30000 }, 'ok'), true, 'Pending participant must get balance action');
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Full Paid', balance: 0 }, 'ok'), false, 'Full Paid participant must not get balance action');
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Free Sponsorship', balance: 0 }, 'ok'), false, 'Free Sponsorship participant must not get balance action');
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Part Paid', balance: 0 }, 'ok'), false, 'Balance zero must hide balance action');
assert.equal(balanceActionEligibleForTest({ paymentStatus: 'Pending', balance: 30000 }, 'issue'), false, 'Invalid mobile must block balance action');

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
    .filter((row) => row.eventType === participant.eventType)
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
const physicalReceiptOrderRows = [
  { id: 'a01', eventType: 'shashtipoorthi', timestamp: '01/07/2026 10:00:00', seatNo: 'A-01', paymentStatus: 'Full Paid', balance: 0, receiptNo: 'SP26-1' },
  { id: 'a02', eventType: 'shashtipoorthi', timestamp: '02/07/2026 10:00:00', seatNo: 'A-02', paymentStatus: 'Full Paid', balance: 0, receiptNo: 'SP26-2' },
  { id: 'a03', eventType: 'shashtipoorthi', timestamp: '03/07/2026 10:00:00', seatNo: 'A-03', paymentStatus: 'Full Paid', balance: 0, receiptNo: 'SP26-3' },
  { id: 'b01', eventType: 'shashtipoorthi', timestamp: '04/07/2026 10:00:00', seatNo: 'B-01', paymentStatus: 'Part Paid', balance: 10000, receiptNo: '' },
  { id: 'b02', eventType: 'shashtipoorthi', timestamp: '05/07/2026 10:00:00', seatNo: 'B-02', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
];
const registrationOrderAllocationRows = [
  { id: 'sp1', eventType: 'shashtipoorthi', timestamp: '7/1/2026 10:00:00', seatNo: 'A-01', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
  { id: 'sp2', eventType: 'shashtipoorthi', timestamp: '7/2/2026 10:00:00', seatNo: 'A-02', paymentStatus: 'Part Paid', balance: 10000, receiptNo: '' },
  { id: 'sp3', eventType: 'shashtipoorthi', timestamp: '7/3/2026 10:00:00', seatNo: 'A-03', paymentStatus: 'Full Paid', balance: 0, receiptNo: '' },
];
assert.equal(
  suggestedReceiptForTest(registrationOrderAllocationRows, registrationOrderAllocationRows[0]),
  'SP26-1',
  'Registration 1 Full Paid must get SP26-1',
);
assert.equal(
  suggestedReceiptForTest(registrationOrderAllocationRows, registrationOrderAllocationRows[1]),
  'SP26-2',
  'Registration 2 Part Paid must reserve SP26-2',
);
assert.equal(
  suggestedReceiptForTest(registrationOrderAllocationRows, registrationOrderAllocationRows[2]),
  'SP26-3',
  'Registration 3 Full Paid must keep SP26-3 and not compress around Part Paid rows',
);
assert.equal(receiptEligibilityForTest(registrationOrderAllocationRows[0]), true, 'Registration 1 Full Paid receipt must be allowed');
assert.equal(receiptEligibilityForTest(registrationOrderAllocationRows[1]), false, 'Registration 2 Part Paid receipt must be blocked');
assert.equal(receiptEligibilityForTest(registrationOrderAllocationRows[2]), true, 'Registration 3 Full Paid receipt must be allowed');
assert.equal(
  suggestedReceiptForTest(registrationOrderAllocationRows, { ...registrationOrderAllocationRows[1], paymentStatus: 'Full Paid', balance: 0 }),
  'SP26-2',
  'Registration 2 keeps SP26-2 after becoming Full Paid',
);
assert.equal(
  suggestedReceiptForTest(physicalReceiptOrderRows, physicalReceiptOrderRows[3]),
  'SP26-4',
  'Part Paid B-01 must reserve SP26-4 by registration order',
);
assert.equal(
  suggestedReceiptForTest(physicalReceiptOrderRows, physicalReceiptOrderRows[4]),
  'SP26-5',
  'Full Paid B-02 must not take B-01 reserved SP26-4',
);
assert.equal(receiptEligibilityForTest(physicalReceiptOrderRows[3]), false, 'Part Paid B-01 receipt JPG must remain blocked');
assert.equal(receiptEligibilityForTest({ ...physicalReceiptOrderRows[3], paymentStatus: 'Full Paid', balance: 0 }), true, 'B-01 receipt JPG becomes available after full payment');
assert.equal(
  suggestedReceiptForTest(physicalReceiptOrderRows, { ...physicalReceiptOrderRows[3], paymentStatus: 'Full Paid', balance: 0 }),
  'SP26-4',
  'B-01 keeps SP26-4 after becoming Full Paid',
);
const bulkZipRowsForTest = [
  { id: 'zip-ready-no-mobile', eventType: 'shashtipoorthi', timestamp: '7/7/2026 10:00:00', seatNo: 'D-01', paymentStatus: 'Full Paid', balance: 0, receiptGenerated: false, mobileNumber: '' },
  { id: 'zip-ready-mobile', eventType: 'shashtipoorthi', timestamp: '7/8/2026 10:00:00', seatNo: 'D-02', paymentStatus: 'Full Paid', balance: 0, receiptGenerated: false, mobileNumber: '6360716397' },
];
const bulkZipEligibleForTest = bulkZipRowsForTest.filter((row) =>
  row.eventType === 'shashtipoorthi' &&
  receiptEligibilityForTest(row) &&
  Boolean(row.timestamp) &&
  Boolean(row.seatNo) &&
  !row.receiptGenerated,
);
assert.equal(bulkZipEligibleForTest.length, 2, 'Bulk ZIP generation must not exclude missing-mobile Full Paid rows');
const whatsappQueueEligibleForTest = bulkZipRowsForTest.filter((row) =>
  receiptEligibilityForTest(row) &&
  normalizeIndianMobileNumberForTest(row.mobileNumber).length === 12 &&
  Boolean(row.seatNo) &&
  Boolean(row.timestamp),
);
assert.equal(whatsappQueueEligibleForTest.length, 1, 'Receipt WhatsApp Queue must still require valid mobile');

const registrationTimestampDateForTest = (timestamp) => {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;
  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?!T)/);
  if (isoDateOnly) return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
  const slashDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    if (year >= 2000) {
      if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
        return `${String(second).padStart(2, '0')}/${String(first).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
      }
      if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
        return `${String(first).padStart(2, '0')}/${String(second).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
      }
    }
  }
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};
assert.equal(registrationTimestampDateForTest('7/10/2026'), '10/07/2026', 'Google Sheet M/D/YYYY timestamp must display as DD/MM/YYYY');
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
assert.ok(frontend.includes('QR Operations'), 'Sidebar must expose QR Operations module');
assert.ok(frontend.includes('Kit Distribution Day'), 'QR module must separate Kit Distribution Day operations');
assert.ok(frontend.includes('Mahotsava Event Day'), 'QR module must separate Mahotsava Event Day operations');
assert.ok(frontend.includes('meetingAttendance'), 'QR module must track Meeting Attendance separately');
assert.ok(frontend.includes('kitCollection'), 'QR module must track Kit Collection separately');
assert.ok(frontend.includes("statusField: 'kitIssued'"), 'Kit Collection must reuse existing Kit Issued column');
assert.ok(!frontend.includes("'Kit Collected'"), 'Frontend must not propose a new Kit Collected column');
assert.ok(frontend.includes('eventAttendance'), 'QR module must track Event Attendance separately');
assert.ok(frontend.includes('madalakkiDistribution'), 'QR module must track Madalakki Distribution separately');
assert.ok(frontend.includes('photoFrameDistribution'), 'QR module must track Photo Frame Distribution separately');
assert.ok(frontend.includes('QRCode.toDataURL'), 'QR module must generate downloadable QR PNGs locally');
assert.ok(frontend.includes('Preview QR'), 'QR module must provide QR preview');
assert.ok(frontend.includes('Download QR PNG'), 'QR module must provide QR download');
assert.ok(frontend.includes('BarcodeDetector'), 'QR module must support camera QR scanning where browsers permit it');
assert.ok(frontend.includes('Manual QR token entry'), 'QR module must provide owner/admin manual fallback');
assert.ok(frontend.includes('scanDistributionQr'), 'QR scans must call the backend scan endpoint');
assert.ok(frontend.includes('Saving scan to Google Sheet'), 'QR scan must not show success until save is in progress/confirmed');
assert.ok(frontend.includes('Already Completed'), 'QR duplicate scans must show Already Completed');
assert.ok(frontend.includes('Login required before scanning.'), 'QR scan must require logged-in identity before saving');
assert.ok(frontend.includes('VolunteerDistributionMonitor'), 'QR Operations must include volunteer distribution monitor');
assert.ok(frontend.includes('Meeting Attendance Pending'), 'Volunteer monitor must filter Meeting Attendance pending');
assert.ok(frontend.includes('Kit Pending'), 'Volunteer monitor must filter Kit pending');
assert.ok(frontend.includes('Event Attendance Pending'), 'Volunteer monitor must filter Event Attendance pending');
assert.ok(frontend.includes('Madalakki Pending'), 'Volunteer monitor must filter Madalakki pending');
assert.ok(frontend.includes('Photo Frame Pending'), 'Volunteer monitor must filter Photo Frame pending');
assert.ok(frontend.includes('href={`tel:+${mobile}`}'), 'Volunteer monitor must provide call links for valid mobiles');
assert.ok(frontend.includes('No payment, receipt, donor, or campaign data is shown here.'), 'Volunteer monitor must state sensitive data is excluded');
const volunteerMonitorBody = frontend.slice(
  frontend.indexOf('function VolunteerDistributionMonitor'),
  frontend.indexOf('function QRVideoScanner'),
);
assert.ok(volunteerMonitorBody.includes('participant.groomName'), 'Volunteer monitor must show husband name');
assert.ok(volunteerMonitorBody.includes('participant.brideName'), 'Volunteer monitor must show wife name');
assert.ok(volunteerMonitorBody.includes('participant.mobileNumber'), 'Volunteer monitor must show mobile number');
assert.ok(volunteerMonitorBody.includes('participant.seatNo'), 'Volunteer monitor must show seat number');
assert.ok(volunteerMonitorBody.includes('EVENTS[participant.eventType]?.shortLabel'), 'Volunteer monitor must show event type');
assert.ok(!volunteerMonitorBody.includes('paidAmount'), 'Volunteer monitor must not show payment amount');
assert.ok(!volunteerMonitorBody.includes('paymentStatus'), 'Volunteer monitor must not show payment status');
assert.ok(!volunteerMonitorBody.includes('receiptNo'), 'Volunteer monitor must not show receipt numbers');
assert.ok(!volunteerMonitorBody.includes('makeWhatsAppUrl'), 'Volunteer monitor must not expose WhatsApp campaigns');
assert.ok(backend.includes('QR_TOKEN_VERSION'), 'Backend must generate opaque QR tokens server-side');
assert.ok(backend.includes("statusField: 'kitIssued'"), 'Backend Kit Collection must reuse existing Kit Issued column');
assert.ok(!backend.includes("kitCollected: ['Kit Collected']"), 'Backend must not require a new Kit Collected column');
assert.ok(backend.includes("remarkField: 'remarks'"), 'Backend must reuse Remarks for Kit Collection audit note');
assert.ok(backend.includes('crypto.createHmac'), 'QR tokens must be opaque and not encode participant data');
assert.ok(backend.includes("app.get('/api/distribution/audit'"), 'Backend must expose read-only distribution audit endpoint');
assert.ok(backend.includes("app.post('/api/distribution/scan'"), 'Backend must expose distribution scan endpoint');
assert.ok(backend.includes("app.post('/api/distribution/scan', requireAuth"), 'Distribution scan must require authentication');
assert.ok(backend.includes('actorUser: req.user'), 'Distribution scan must use the authenticated user from the session');
assert.ok(backend.includes('const actor = actorUser?.name || actorUser?.mobile'), 'Distribution scan must record logged-in user identity');
assert.ok(backend.includes('already-completed'), 'Backend duplicate scan must not overwrite original timestamp/user');
assert.ok(backend.includes('missingColumns'), 'Backend must report missing Sheet columns instead of silently failing');
assert.ok(backend.includes('const requiredFields = ['), 'Backend must calculate selected operation fields dynamically');
assert.ok(backend.includes('operation.statusField') && backend.includes('operation.timeField') && backend.includes('operation.byField'), 'Each scan must update only the selected operation fields');
assert.ok(!backend.includes('Meeting Attendance = Yes'), 'Backend must not hardcode raw formula-like multi-field updates');
assert.ok(frontend.includes('function LoginPage'), 'Frontend must show a login page before app content');
assert.ok(frontend.includes('Mobile Number'), 'Login page must ask for mobile number');
assert.ok(frontend.includes('PIN'), 'Login page must ask for PIN');
assert.ok(frontend.includes('Show') && frontend.includes('Hide'), 'Login page must support Show/Hide PIN');
assert.ok(frontend.includes('/api/auth/login'), 'Frontend login must call backend auth endpoint');
assert.ok(frontend.includes('/api/auth/logout'), 'Frontend logout must call backend logout endpoint');
assert.ok(frontend.includes('function RootApp'), 'Root app must gate content behind auth state');
assert.ok(frontend.includes('if (!auth.user) return <LoginPage auth={auth} />'), 'Application content must not render before login');
assert.ok(!frontend.includes('localStorage'), 'Frontend must not store auth credentials or sessions in localStorage');
assert.ok(!frontend.includes('passwordHash'), 'Frontend must not expose password hashes');
assert.ok(backend.includes('crypto.scryptSync'), 'Backend must hash PINs with scrypt');
assert.ok(backend.includes('crypto.timingSafeEqual'), 'Backend must verify PIN hashes with timing-safe comparison');
assert.ok(backend.includes('AUTH_BOOTSTRAP_ADMIN_MOBILE'), 'Backend must support secure bootstrap admin via environment variables');
assert.ok(packageJson.includes('"mongoose"'), 'MongoDB Atlas support must include mongoose dependency');
assert.ok(envExample.includes('MONGODB_URI=') && envExample.includes('MONGODB_DB=mvst_seva_portal'), 'Environment example must include MongoDB variables');
assert.ok(mongoConnection.includes('mongoose.connect(process.env.MONGODB_URI'), 'Mongo connection helper must use MONGODB_URI');
assert.ok(mongoConnection.includes('dbName: process.env.MONGODB_DB'), 'Mongo connection helper must support MONGODB_DB');
assert.ok(mongoConnection.includes("'mvst_seva_portal'"), 'Mongo connection helper must default to mvst_seva_portal');
assert.ok(userModel.includes("mongoose.model('User'"), 'Mongo users model must be defined');
assert.ok(userModel.includes("collection: 'users'"), 'Mongo users collection must be named users');
assert.ok(userModel.includes('pinHash'), 'Mongo users must store only PIN hashes');
assert.ok(userModel.includes("'PST_ADMIN'") && userModel.includes("'VOLUNTEER'"), 'Mongo users must support PST Admin and volunteer roles');
assert.ok(sessionModel.includes("mongoose.model('Session'"), 'Mongo sessions model must be defined');
assert.ok(sessionModel.includes("collection: 'sessions'"), 'Mongo sessions collection must be named sessions');
assert.ok(sessionModel.includes('tokenHash'), 'Mongo sessions must store a token hash');
assert.ok(sessionModel.includes('expiresAt'), 'Mongo sessions must store expiry');
assert.ok(qrTokenModel.includes("mongoose.model('QrToken'"), 'Mongo QR token model must be defined');
assert.ok(qrTokenModel.includes("collection: 'qr_tokens'"), 'Mongo QR token collection must be named qr_tokens');
assert.ok(qrTokenModel.includes('tokenHash'), 'QR tokens must be stored by token hash');
assert.ok(!qrTokenModel.includes('mobile') && !qrTokenModel.includes('address') && !qrTokenModel.includes('paidAmount'), 'QR token model must not store participant private details');
assert.ok(distributionLogModel.includes("mongoose.model('DistributionLog'"), 'Distribution log model must be defined');
assert.ok(distributionLogModel.includes("collection: 'distribution_logs'"), 'Mongo distribution log collection must be named distribution_logs');
assert.ok(distributionLogModel.includes('participantId') && distributionLogModel.includes('operation') && distributionLogModel.includes('operatorUserId'), 'Distribution logs must store participant id, operation and operator');
assert.ok(backend.includes('isMongoConfigured()'), 'Backend must support optional MongoDB mode');
assert.ok(backend.includes('await User.create'), 'Backend user creation must support MongoDB');
assert.ok(backend.includes('await Session.create'), 'Backend sessions must support MongoDB');
assert.ok(backend.includes('await QrToken.updateOne'), 'Backend QR foundation must store QR token metadata in MongoDB when configured');
assert.ok(backend.includes('await DistributionLog.create'), 'Backend distribution logs must write to MongoDB when configured');
assert.ok(readme.includes('MongoDB Atlas Preparation'), 'README must include MongoDB Atlas setup guide');
assert.ok(readme.includes('No participant, donor, booking, receipt, payment, or sponsorship data is migrated to MongoDB.'), 'README must state Sheets data is not migrated');
assert.ok(readme.includes('Rollback Plan'), 'README must include MongoDB rollback plan');
assert.ok(backend.includes('HttpOnly'), 'Session cookie must be HttpOnly');
assert.ok(backend.includes('SameSite=Lax'), 'Session cookie must set SameSite');
assert.ok(backend.includes('Secure'), 'Session cookie must support Secure flag in production');
assert.ok(backend.includes('[ROLE_PST]: 12 * 60 * 60 * 1000'), 'PST sessions must last 12 hours');
assert.ok(backend.includes('[ROLE_VOLUNTEER]: 8 * 60 * 60 * 1000'), 'Volunteer sessions must last 8 hours');
assert.ok(backend.includes('[ROLE_CREW]: 8 * 60 * 60 * 1000'), 'Crew sessions must last 8 hours');
assert.ok(backend.includes('function requireAuth'), 'Backend must define requireAuth middleware');
assert.ok(backend.includes('function requirePst'), 'Backend must define PST-only middleware');
assert.ok(backend.includes("res.status(401).json({ ok: false, error: 'Unauthorized' })"), 'Missing login must return 401');
assert.ok(backend.includes("res.status(403).json({ ok: false, error: 'Forbidden' })"), 'Restricted role must return 403');
assert.ok(backend.includes("app.patch('/api/registrations/:id', requirePst"), 'Registration write-back must be PST-only');
assert.ok(backend.includes("app.get(['/api/mangalya-sponsorship', '/api/mangalya-donors'], requirePst"), 'Donor APIs must be PST-only');
assert.ok(backend.includes("app.get('/api/whatsapp-group-config', requirePst"), 'WhatsApp campaign/group config must be PST-only');
assert.ok(backend.includes("app.get('/api/users', requirePst"), 'User list must be PST-only');
assert.ok(backend.includes("app.post('/api/users', requirePst"), 'User creation must be PST-only');
assert.ok(frontend.includes('User Access'), 'PST UI must expose User Access menu');
assert.ok(frontend.includes('function UserAccessSection'), 'Frontend must implement User Access management');
assert.ok(frontend.includes('Add Volunteer'), 'User Access must support adding volunteers');
assert.ok(frontend.includes('Reset PIN'), 'User Access must support PIN resets');
assert.ok(frontend.includes('Last Login'), 'User Access must show last login');
assert.ok(frontend.includes("activeView === 'user-access' && isPst"), 'User Access screen must be PST-only');
assert.ok(frontend.includes("activeView === 'mangalya-donors' && isPst"), 'Donor module must be PST-only');
assert.ok(frontend.includes("activeView === 'previous-donors' && isPst"), 'Previous donor campaign must be PST-only');
assert.ok(frontend.includes("activeView === 'whatsapp-groups' && isPst"), 'WhatsApp group module must be PST-only');
assert.ok(frontend.includes('useMangalyaDonors(isPst)'), 'Frontend must not load donor APIs for volunteers');
assert.ok(frontend.includes('useSponsorshipRequirements(isPst)'), 'Frontend must not load requirements APIs for volunteers');
assert.ok(frontend.includes('useWhatsAppGroupConfig(isPst)'), 'Frontend must not load PST admins for volunteers');
assert.ok(frontend.includes('backendError.status === 401 || backendError.status === 403'), 'Frontend must not fall back to public CSV after auth failure');
assert.ok(frontend.includes('VolunteerParticipantCard'), 'Volunteer/Crew participant list must use restricted participant cards');
const volunteerCardBody = frontend.slice(
  frontend.indexOf('function VolunteerParticipantCard'),
  frontend.indexOf('function useAuth'),
);
assert.ok(volunteerCardBody.includes('participant.seatNo'), 'Volunteer cards must show seat number');
assert.ok(volunteerCardBody.includes('participant.groomName'), 'Volunteer cards must show husband name');
assert.ok(volunteerCardBody.includes('participant.brideName'), 'Volunteer cards must show wife name');
assert.ok(volunteerCardBody.includes('participant.mobileNumber'), 'Volunteer cards must show mobile number');
assert.ok(volunteerCardBody.includes('tel:+'), 'Volunteer cards must include call button');
assert.ok(!volunteerCardBody.includes('paidAmount'), 'Volunteer cards must not show payment amounts');
assert.ok(!volunteerCardBody.includes('receiptNo'), 'Volunteer cards must not show receipt numbers');
assert.ok(!volunteerCardBody.includes('balance'), 'Volunteer cards must not show balances');
assert.ok(!volunteerCardBody.includes('qrToken'), 'Volunteer cards must not show QR tokens');
console.log('Event mapping and WhatsApp message regression checks passed.');
