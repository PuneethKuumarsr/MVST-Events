import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const DEFAULT_RANGE = 'Form Responses 1!A:AZ';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');
const serviceAccountPath = path.join(projectRoot, 'service-account.json');
const ADMIN_FIELDS = {
  paidAmount: ['Paid Amount'],
  paymentStatus: ['Payment Status'],
  treasurerVerified: ['Treasurer Verified'],
  kitIssued: ['KIT Issued', 'Kit Issued'],
  remarks: ['Remarks'],
  welcomeSent: ['Welcome Sent'],
  welcomeSentDate: ['Welcome Sent Date'],
  paymentSent: ['Payment Sent'],
  paymentSentDate: ['Payment Sent Date'],
  seatNo: ['Seat No'],
  receiptNo: ['Receipt No'],
  receiptGenerated: ['Receipt Generated'],
};
const DONOR_FIELDS = {
  sponsorName: ['Sponsor Name'],
  contactNo: ['Contact Number', 'Contact No'],
  eventYear: ['Event Year'],
  eventName: ['Event Name'],
  contributionType: ['Contribution Type'],
  category: ['Category', 'Sponsorship Category'],
  contributionNature: ['Contribution Nature'],
  sponsored2025: ['Sponsored 2025'],
  sponsored2026: ['Sponsored 2026'],
  confirmedQuantity: ['Confirmed Quantity', 'Sponsored 2026'],
  receivedQuantity: ['Received Quantity'],
  pendingQuantity: ['Pending Quantity'],
  unit: ['Unit'],
  estimatedValue: ['Estimated Value'],
  actualValue: ['Actual Value'],
  confirmedAmount: ['Confirmed Amount', 'Amount (Auto)'],
  receivedAmount: ['Received Amount'],
  balanceAmount: ['Balance Amount'],
  status: ['Status'],
  remarks: ['Remarks'],
  introducedBy: ['Introduced By', 'Trustee Reference', 'Introduced By / Trustee Reference'],
  followUpBy: ['Follow-up By', 'Follow Up By'],
  collectedBy: ['Collected By'],
  invitationHandedOverBy: ['Invitation Handed Over By'],
  paymentMode: ['Payment Mode', 'Contribution Mode'],
  bankOrCash: ['Bank / Cash', 'Bank Cash'],
  transactionReference: ['Transaction Reference / UTR / Cheque No', 'Transaction Reference', 'UTR', 'Cheque No'],
  paymentDate: ['Payment Date', 'Received Date'],
  paymentProofLink: ['Payment Proof Link'],
  appealSent: ['Appeal Sent', 'WhatsApp Sent'],
  appealSentDate: ['Appeal Sent Date', 'Sent Date'],
  confirmationSent: ['Confirmation Sent'],
  confirmationSentDate: ['Confirmation Sent Date'],
  paymentMessageSent: ['Payment Message Sent'],
  paymentMessageSentDate: ['Payment Message Sent Date'],
  postEventSent: ['Post Event Sent'],
  postEventSentDate: ['Post Event Sent Date'],
  whatsAppSent: ['WhatsApp Sent'],
  sentDate: ['Sent Date'],
};
const DONOR_RANGE = sponsorshipRange(process.env.MANGALYA_SPONSORSHIP_RANGE || process.env.SPONSORSHIP_CONTRIBUTIONS_RANGE || "'Sponsorship Contributions'!A:AZ");
const REQUIREMENT_RANGE = process.env.SPONSORSHIP_REQUIREMENTS_RANGE || "'Sponsorship Requirements'!A:O";
const WHATSAPP_PST_ADMINS_RANGE = process.env.WHATSAPP_PST_ADMINS_RANGE || "'WhatsApp PST Admins'!A:B";
const WHATSAPP_GROUP_LOG_RANGE = process.env.WHATSAPP_GROUP_LOG_RANGE || "'WhatsApp Group Log'!A:F";
const WHATSAPP_GROUP_LOG_HEADERS = ['Group Name', 'Event', 'Creation Date', 'Participant Count', 'Status', 'Remarks'];
const FREE_SPONSORSHIP_STATUS = 'free sponsorship';

const EVENTS = {
  shashtipoorthi: {
    id: 'shashtipoorthi',
    sourceLabel: 'Shashtipoorthi Sheet',
    contribution: 30000,
  },
  bhimaratha: {
    id: 'bhimaratha',
    sourceLabel: 'Bhimaratha Sheet',
    contribution: 20000,
  },
};

const SHEETS = [
  {
    ...EVENTS.bhimaratha,
    spreadsheetId: process.env.BHIMARATHA_SHEET_ID,
    csvUrl:
      'https://docs.google.com/spreadsheets/d/1lAiv6mWGXtVlxZ-4p1krjhc3bmau_Pgl1PKq0GylnJw/gviz/tq?tqx=out:csv&gid=1275850646',
  },
  {
    ...EVENTS.shashtipoorthi,
    spreadsheetId: process.env.SHASHTIPOORTHI_SHEET_ID,
    csvUrl:
      'https://docs.google.com/spreadsheets/d/1PyxCC2HN7hCls-xR8Ao62xVZbM6w0OEa8Ri_OUu7XQo/gviz/tq?tqx=out:csv&gid=1773543601',
  },
];

let cache = {
  rows: [],
  refreshedAt: null,
  source: null,
  writeEnabled: false,
};

let donorCache = {
  rows: [],
  refreshedAt: null,
  source: null,
  writeEnabled: false,
};

let requirementCache = {
  rows: [],
  refreshedAt: null,
  source: null,
  writeEnabled: false,
};

function sponsorshipRange(range) {
  return String(range || "'Sponsorship Contributions'!A:AZ")
    .replace(/A:J$/i, 'A:AZ')
    .replace(/A:R$/i, 'A:AZ')
    .replace(/A:AD$/i, 'A:AZ');
}

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const CATEGORY_ALIASES = {
  vegetable: 'Vegetables',
  vegetables: 'Vegetables',
  misc: 'Miscellaneous',
  miscellaneous: 'Miscellaneous',
  cuttlery: 'Cutlery',
  cutlery: 'Cutlery',
  stationary: 'Stationery',
  stationery: 'Stationery',
  rent: 'Choultry',
  choultry: 'Choultry',
  veesles: 'Vessels',
  vessels: 'Vessels',
};

function canonicalCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return CATEGORY_ALIASES[normalizeKey(raw)] || raw;
}

function getCell(row, headerMap, labels) {
  for (const label of labels) {
    const index = headerMap[normalizeKey(label)];
    if (index !== undefined) return row[index] || '';
  }
  return '';
}

function getColumnIndex(headerMap, labels) {
  for (const label of labels) {
    const index = headerMap[normalizeKey(label)];
    if (index !== undefined) return index;
  }
  return null;
}

function buildHeaderMap(headers) {
  return headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});
}

function numberFrom(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolFrom(value) {
  return ['yes', 'y', 'true', 'verified', 'issued', 'done', '1'].includes(
    String(value || '').trim().toLowerCase(),
  );
}

function isFreeSponsorshipStatus(status) {
  return String(status || '').trim().toLowerCase() === FREE_SPONSORSHIP_STATUS;
}

function readServiceAccountFile() {
  try {
    if (!fs.existsSync(serviceAccountPath)) return null;
    const raw = fs.readFileSync(serviceAccountPath, 'utf8').trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function getGoogleCredentials() {
  const fileCredentials = readServiceAccountFile();
  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || fileCredentials?.client_email || '',
    key: process.env.GOOGLE_PRIVATE_KEY || fileCredentials?.private_key || '',
  };
}

function hasGoogleConfig() {
  const credentials = getGoogleCredentials();
  return Boolean(
    credentials.email &&
      credentials.key &&
      process.env.BHIMARATHA_SHEET_ID &&
      process.env.SHASHTIPOORTHI_SHEET_ID,
  );
}

function hasGoogleCredentials() {
  const credentials = getGoogleCredentials();
  return Boolean(credentials.email && credentials.key);
}

function hasDonorConfig() {
  return Boolean(
    hasGoogleCredentials() &&
      (process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID),
  );
}

function getSheetName(range = process.env.GOOGLE_SHEETS_RANGE || DEFAULT_RANGE) {
  return String(range).split('!')[0].replace(/^'|'$/g, '');
}

function columnLetter(index) {
  let column = '';
  let number = index + 1;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    number = Math.floor((number - 1) / 26);
  }
  return column;
}

async function ensureSheetTabWithHeaders(spreadsheetId, range, headers) {
  const sheetName = getSheetName(range);
  const sheets = createSheetsClient({ requireRegistrationSheets: false });
  const workbook = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = workbook.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:${columnLetter(headers.length - 1)}1`,
  });
  const currentHeaders = headerResponse.data.values?.[0] || [];
  if (!headers.every((header, index) => currentHeaders[index] === header)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:${columnLetter(headers.length - 1)}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });
  }

  return sheets;
}

function buildAdminColumnMap(headerMap) {
  return Object.fromEntries(
    Object.entries(ADMIN_FIELDS).map(([field, labels]) => [field, getColumnIndex(headerMap, labels)]),
  );
}

function buildDonorColumnMap(headerMap) {
  return Object.fromEntries(
    Object.entries(DONOR_FIELDS).map(([field, labels]) => [field, getColumnIndex(headerMap, labels)]),
  );
}

function normalizeRows(values, source) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  const headerMap = headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});
  const adminColumns = buildAdminColumnMap(headerMap);

  return values
    .slice(1)
    .map((row, index) => {
      const rowNumber = index + 2;
      const paidAmount = numberFrom(getCell(row, headerMap, ['Paid Amount']));
      const contribution = source.contribution;
      const calculatedStatus =
        paidAmount >= contribution ? 'Full Paid' : paidAmount > 0 ? 'Part Paid' : 'Pending';
      const sheetPaymentStatus = getCell(row, headerMap, ['Payment Status']);
      const paymentStatus = sheetPaymentStatus || calculatedStatus;
      const balance = isFreeSponsorshipStatus(paymentStatus) ? 0 : Math.max(contribution - paidAmount, 0);

      return {
        id: `${source.id}:${rowNumber}`,
        rowNumber,
        eventType: source.id,
        sourceLabel: source.sourceLabel,
        timestamp: getCell(row, headerMap, ['Timestamp']),
        groomName: getCell(row, headerMap, ['Groom Name']),
        groomAge: getCell(row, headerMap, ['Groom Age']),
        groomAadhaar: getCell(row, headerMap, ['Groom Aadhaar Card', 'Groom Aadhar Card']),
        brideName: getCell(row, headerMap, ['Bride Name']),
        brideAge: getCell(row, headerMap, ['Bride Age']),
        brideAadhaar: getCell(row, headerMap, ['Bride Aadhaar Card', 'Bride Aadhar Card']),
        address: getCell(row, headerMap, ['Address']),
        gothra: getCell(row, headerMap, ['Gothra']),
        couplePhoto: getCell(row, headerMap, ['Couple Photo']),
        mobileNumber: getCell(row, headerMap, ['Mobile Number', 'Phone']),
        emailId: getCell(row, headerMap, ['Email ID', 'Email', 'E-mail ID']),
        paymentQr: getCell(row, headerMap, ['Scan this QR to Pay']),
        paymentScreenshot: getCell(row, headerMap, [
          'Upload Payment Screenshot',
          'Payment Screenshot',
        ]),
        paidAmount,
        paymentStatus,
        treasurerVerified: boolFrom(getCell(row, headerMap, ['Treasurer Verified'])),
        kitIssued: boolFrom(getCell(row, headerMap, ['KIT Issued', 'Kit Issued'])),
        remarks: getCell(row, headerMap, ['Remarks']),
        welcomeSent: boolFrom(getCell(row, headerMap, ['Welcome Sent'])),
        welcomeSentDate: getCell(row, headerMap, ['Welcome Sent Date']),
        paymentSent: boolFrom(getCell(row, headerMap, ['Payment Sent'])),
        paymentSentDate: getCell(row, headerMap, ['Payment Sent Date']),
        seatNo: getCell(row, headerMap, ['Seat No']),
        receiptNo: getCell(row, headerMap, ['Receipt No']),
        receiptGenerated: boolFrom(getCell(row, headerMap, ['Receipt Generated'])),
        contribution,
        balance,
        adminColumns,
      };
    })
    .filter((row) => row.groomName || row.brideName || row.mobileNumber);
}

function parseSheetCsv(csv, source) {
  return normalizeRows(parseCsv(csv), source).map(({ adminColumns, ...row }) => row);
}

function normalizeDonorRows(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  const headerMap = headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});
  const adminColumns = buildDonorColumnMap(headerMap);

  return values
    .slice(1)
    .map((row, index) => {
      const rowNumber = index + 2;
      const sponsored2025 = numberFrom(getCell(row, headerMap, ['Sponsored 2025', 'Quantity Sponsored']));
      const sponsored2026 = numberFrom(getCell(row, headerMap, ['Sponsored 2026']));
      const confirmedQuantity = numberFrom(getCell(row, headerMap, ['Confirmed Quantity', 'Sponsored 2026'])) || sponsored2026;
      const receivedQuantity = numberFrom(getCell(row, headerMap, ['Received Quantity']));
      const confirmedAmount = numberFrom(getCell(row, headerMap, ['Confirmed Amount', 'Amount (Auto)']));
      const receivedAmount = numberFrom(getCell(row, headerMap, ['Received Amount']));
      const amount = confirmedAmount;
      const category = getCell(row, headerMap, ['Category', 'Sponsorship Category']) || process.env.DEFAULT_SPONSORSHIP_CATEGORY || '';
      const appealSent = boolFrom(getCell(row, headerMap, ['Appeal Sent', 'WhatsApp Sent']));
      const appealSentDate = getCell(row, headerMap, ['Appeal Sent Date', 'Sent Date']);
      return {
        id: `mangalya:${rowNumber}`,
        rowNumber,
        slNo: getCell(row, headerMap, ['Sl No', 'Sl. No.']),
        sponsorName: getCell(row, headerMap, ['Sponsor Name', 'Mangalya Donor']),
        donorName: getCell(row, headerMap, ['Sponsor Name', 'Mangalya Donor']),
        contactNo: getCell(row, headerMap, ['Contact Number', 'Contact No']),
        eventYear: getCell(row, headerMap, ['Event Year']),
        eventName: getCell(row, headerMap, ['Event Name']),
        contributionType: getCell(row, headerMap, ['Contribution Type']),
        category,
        canonicalCategory: canonicalCategory(category),
        contributionNature: getCell(row, headerMap, ['Contribution Nature']) || 'Monetary',
        sponsored2025,
        sponsored2026,
        confirmedQuantity,
        receivedQuantity,
        pendingQuantity: numberFrom(getCell(row, headerMap, ['Pending Quantity'])) || Math.max(confirmedQuantity - receivedQuantity, 0),
        unit: getCell(row, headerMap, ['Unit']) || process.env.DEFAULT_SPONSORSHIP_UNIT || '',
        estimatedValue: numberFrom(getCell(row, headerMap, ['Estimated Value'])),
        actualValue: numberFrom(getCell(row, headerMap, ['Actual Value'])),
        confirmedAmount,
        receivedAmount,
        balanceAmount: numberFrom(getCell(row, headerMap, ['Balance Amount'])) || Math.max(confirmedAmount - receivedAmount, 0),
        amount,
        status: getCell(row, headerMap, ['Status']) || 'Pending',
        remarks: getCell(row, headerMap, ['Remarks']),
        introducedBy: getCell(row, headerMap, ['Introduced By', 'Trustee Reference', 'Introduced By / Trustee Reference']),
        followUpBy: getCell(row, headerMap, ['Follow-up By', 'Follow Up By']),
        collectedBy: getCell(row, headerMap, ['Collected By']),
        invitationHandedOverBy: getCell(row, headerMap, ['Invitation Handed Over By']),
        paymentMode: getCell(row, headerMap, ['Payment Mode', 'Contribution Mode']),
        bankOrCash: getCell(row, headerMap, ['Bank / Cash', 'Bank Cash']),
        transactionReference: getCell(row, headerMap, ['Transaction Reference / UTR / Cheque No', 'Transaction Reference', 'UTR', 'Cheque No']),
        paymentDate: getCell(row, headerMap, ['Payment Date', 'Received Date']),
        paymentProofLink: getCell(row, headerMap, ['Payment Proof Link']),
        appealSent,
        appealSentDate,
        confirmationSent: boolFrom(getCell(row, headerMap, ['Confirmation Sent'])),
        confirmationSentDate: getCell(row, headerMap, ['Confirmation Sent Date']),
        paymentMessageSent: boolFrom(getCell(row, headerMap, ['Payment Message Sent'])),
        paymentMessageSentDate: getCell(row, headerMap, ['Payment Message Sent Date']),
        postEventSent: boolFrom(getCell(row, headerMap, ['Post Event Sent'])),
        postEventSentDate: getCell(row, headerMap, ['Post Event Sent Date']),
        whatsAppSent: appealSent,
        sentDate: appealSentDate,
        adminColumns,
      };
    })
    .filter((row) => row.sponsorName || row.contactNo);
}

function normalizeRequirementRows(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  const headerMap = headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});

  return values
    .slice(1)
    .map((row, index) => {
      const category = getCell(row, headerMap, ['Category']);
      const requiredQuantity = numberFrom(getCell(row, headerMap, ['Required Quantity']));
      const estimatedUnitCost = numberFrom(getCell(row, headerMap, ['Estimated Unit Cost']));
      const estimatedTotalCost = numberFrom(getCell(row, headerMap, ['Estimated Total Cost'])) || requiredQuantity * estimatedUnitCost;
      const confirmedQuantity = numberFrom(getCell(row, headerMap, ['Confirmed Quantity']));
      const receivedQuantity = numberFrom(getCell(row, headerMap, ['Received Quantity']));
      const confirmedAmount = numberFrom(getCell(row, headerMap, ['Confirmed Amount']));
      const receivedAmount = numberFrom(getCell(row, headerMap, ['Received Amount']));
      return {
        id: `requirement:${index + 2}`,
        rowNumber: index + 2,
        eventYear: getCell(row, headerMap, ['Event Year']),
        eventName: getCell(row, headerMap, ['Event Name']),
        category,
        canonicalCategory: canonicalCategory(category),
        requiredQuantity,
        unit: getCell(row, headerMap, ['Unit']),
        estimatedUnitCost,
        estimatedTotalCost,
        confirmedQuantity,
        receivedQuantity,
        remainingQuantity: numberFrom(getCell(row, headerMap, ['Remaining Quantity'])) || Math.max(requiredQuantity - receivedQuantity, 0),
        confirmedAmount,
        receivedAmount,
        remainingAmount: numberFrom(getCell(row, headerMap, ['Remaining Amount'])) || Math.max(estimatedTotalCost - receivedAmount, 0),
        status: getCell(row, headerMap, ['Status']) || 'Pending',
        remarks: getCell(row, headerMap, ['Remarks']),
      };
    })
    .filter((row) => row.eventYear || row.eventName || row.category);
}

function requireConfig() {
  const missing = [];
  const credentials = getGoogleCredentials();
  if (!credentials.email) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL or service-account.json client_email');
  if (!credentials.key) missing.push('GOOGLE_PRIVATE_KEY or service-account.json private_key');
  if (!process.env.BHIMARATHA_SHEET_ID) missing.push('BHIMARATHA_SHEET_ID');
  if (!process.env.SHASHTIPOORTHI_SHEET_ID) missing.push('SHASHTIPOORTHI_SHEET_ID');
  if (missing.length) {
    throw new Error(`Missing Google Sheets configuration: ${missing.join(', ')}`);
  }
  return credentials;
}

function requireGoogleCredentials() {
  const missing = [];
  const credentials = getGoogleCredentials();
  if (!credentials.email) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL or service-account.json client_email');
  if (!credentials.key) missing.push('GOOGLE_PRIVATE_KEY or service-account.json private_key');
  if (missing.length) {
    throw new Error(`Missing Google Sheets credentials: ${missing.join(', ')}`);
  }
  return credentials;
}

function createSheetsClient({ requireRegistrationSheets = true } = {}) {
  const credentials = requireRegistrationSheets ? requireConfig() : requireGoogleCredentials();
  const auth = new google.auth.JWT({
    email: credentials.email,
    key: credentials.key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function loadFromGoogleApi() {
  const sheets = createSheetsClient();
  const range = process.env.GOOGLE_SHEETS_RANGE || DEFAULT_RANGE;

  const results = await Promise.all(
    SHEETS.map(async (source) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: source.spreadsheetId,
        range,
      });
      return normalizeRows(response.data.values, source);
    }),
  );

  return { rows: results.flat(), source: 'google-api', writeEnabled: true };
}

async function loadFromCsvFallback() {
  const results = await Promise.all(
    SHEETS.map(async (source) => {
      const response = await fetch(withCacheBust(source.csvUrl), { cache: 'no-store' });
      if (!response.ok) throw new Error(`CSV sheet ${source.id} returned ${response.status}`);
      return parseSheetCsv(await response.text(), source);
    }),
  );

  return {
    rows: results.flat(),
    source: 'public-csv',
    writeEnabled: false,
    notice:
      'Google public CSV may take a few minutes to update. For instant updates, enable Google Sheets API service account.',
  };
}

function publicRows(rows) {
  return rows.map(({ adminColumns, ...row }) => row);
}

function publicDonorRows(rows) {
  return rows.map(({ adminColumns, ...row }) => row);
}

async function loadRegistrations() {
  let result;
  try {
    result = await loadFromGoogleApi();
  } catch (error) {
    result = await loadFromCsvFallback();
  }

  cache = {
    rows: result.rows,
    refreshedAt: new Date().toISOString(),
    source: result.source,
    writeEnabled: result.writeEnabled,
    notice: result.notice || null,
  };

  return cache;
}

async function loadMangalyaDonors() {
  if (!hasDonorConfig()) {
    donorCache = {
      rows: [],
      refreshedAt: new Date().toISOString(),
      source: 'not-configured',
      writeEnabled: false,
      notice: 'Mangalya donor sheet is not configured.',
    };
    return donorCache;
  }

  const sheets = createSheetsClient({ requireRegistrationSheets: false });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID,
    range: DONOR_RANGE,
  });

  donorCache = {
    rows: normalizeDonorRows(response.data.values),
    refreshedAt: new Date().toISOString(),
    source: 'google-api',
    writeEnabled: true,
    notice: null,
  };

  return donorCache;
}

async function loadSponsorshipRequirements() {
  if (!hasDonorConfig()) {
    requirementCache = {
      rows: [],
      refreshedAt: new Date().toISOString(),
      source: 'not-configured',
      writeEnabled: false,
      notice: 'Sponsorship requirements sheet is not configured.',
    };
    return requirementCache;
  }

  try {
    const sheets = createSheetsClient({ requireRegistrationSheets: false });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID,
      range: REQUIREMENT_RANGE,
    });

    requirementCache = {
      rows: normalizeRequirementRows(response.data.values),
      refreshedAt: new Date().toISOString(),
      source: 'google-api',
      writeEnabled: true,
      notice: null,
    };
  } catch (error) {
    requirementCache = {
      rows: [],
      refreshedAt: new Date().toISOString(),
      source: 'google-api',
      writeEnabled: true,
      notice: 'Sponsorship Requirements tab is not available yet.',
    };
  }

  return requirementCache;
}

async function loadWhatsappPstAdmins() {
  if (!hasDonorConfig()) return [];

  const spreadsheetId = process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID;
  const sheets = await ensureSheetTabWithHeaders(spreadsheetId, WHATSAPP_PST_ADMINS_RANGE, ['Name', 'Mobile Number']);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: WHATSAPP_PST_ADMINS_RANGE,
  });

  const values = response.data.values || [];
  const [headers = [], ...rows] = values;
  const headerMap = buildHeaderMap(headers);

  return rows
    .map((row) => ({
      name: getCell(row, headerMap, ['Name', 'PST Member', 'Admin Name']),
      mobileNumber: getCell(row, headerMap, ['Mobile Number', 'Contact Number', 'Contact No', 'Mobile']),
    }))
    .filter((admin) => admin.name || admin.mobileNumber);
}

async function appendWhatsappGroupLog({ groupName, eventType, participantCount, status, remarks }) {
  if (!hasDonorConfig()) {
    const error = new Error('Private Google Sheet is not configured for WhatsApp group logging.');
    error.statusCode = 403;
    throw error;
  }

  const spreadsheetId = process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID;
  const sheets = await ensureSheetTabWithHeaders(spreadsheetId, WHATSAPP_GROUP_LOG_RANGE, WHATSAPP_GROUP_LOG_HEADERS);
  const sheetName = getSheetName(WHATSAPP_GROUP_LOG_RANGE);
  const creationDate = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:F`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        String(groupName || ''),
        String(eventType || ''),
        creationDate,
        Number(participantCount || 0),
        String(status || 'Created manually'),
        String(remarks || 'Assisted WhatsApp group workflow'),
      ]],
    },
  });

  return { groupName, eventType, creationDate, participantCount, status };
}

function sourceForEvent(eventType) {
  return SHEETS.find((sheet) => sheet.id === eventType);
}

function normalizePatchValue(field, value) {
  if (field === 'paidAmount') return String(numberFrom(value));
  if (field === 'treasurerVerified' || field === 'kitIssued' || field === 'welcomeSent' || field === 'paymentSent' || field === 'receiptGenerated') return value ? 'Yes' : 'No';
  return String(value ?? '');
}

async function updateRegistration(registrationId, updates) {
  if (!hasGoogleConfig()) {
    const error = new Error('Read-only mode. Google Sheets credentials are not configured.');
    error.statusCode = 403;
    throw error;
  }

  if (!cache.refreshedAt || cache.source !== 'google-api') await loadFromGoogleApi().then((result) => {
    cache = {
      rows: result.rows,
      refreshedAt: new Date().toISOString(),
      source: result.source,
      writeEnabled: result.writeEnabled,
    };
  });

  const currentRow = cache.rows.find((row) => row.id === registrationId);
  if (!currentRow) {
    const error = new Error('Registration row not found. Refresh data and try again.');
    error.statusCode = 404;
    throw error;
  }

  const source = sourceForEvent(currentRow.eventType);
  if (!source?.spreadsheetId) {
    const error = new Error('Registration source sheet is not configured for write-back.');
    error.statusCode = 403;
    throw error;
  }

  const data = Object.entries(updates || {})
    .filter(([field]) => Object.prototype.hasOwnProperty.call(ADMIN_FIELDS, field))
    .map(([field, value]) => {
      const columnIndex = currentRow.adminColumns?.[field];
      if (columnIndex === null || columnIndex === undefined) return null;
      const column = columnLetter(columnIndex);
      const sheetName = getSheetName();
      return {
        range: `'${sheetName}'!${column}${currentRow.rowNumber}`,
        values: [[normalizePatchValue(field, value)]],
      };
    })
    .filter(Boolean);

  if (!data.length) {
    const error = new Error('No editable admin columns were provided.');
    error.statusCode = 400;
    throw error;
  }

  const sheets = createSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: source.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  return loadRegistrations();
}

function normalizeDonorPatchValue(field, value) {
  if (
    field === 'whatsAppSent' ||
    field === 'appealSent' ||
    field === 'confirmationSent' ||
    field === 'paymentMessageSent' ||
    field === 'postEventSent'
  ) return value ? 'Yes' : 'No';
  if (
    field === 'sponsored2025' ||
    field === 'sponsored2026' ||
    field === 'confirmedQuantity' ||
    field === 'receivedQuantity' ||
    field === 'pendingQuantity' ||
    field === 'estimatedValue' ||
    field === 'actualValue' ||
    field === 'confirmedAmount' ||
    field === 'receivedAmount' ||
    field === 'balanceAmount'
  ) return String(numberFrom(value));
  return String(value ?? '');
}

async function updateMangalyaDonor(donorId, updates) {
  if (!hasDonorConfig()) {
    const error = new Error('Mangalya donor sheet is not configured for write-back.');
    error.statusCode = 403;
    throw error;
  }

  if (!donorCache.refreshedAt || donorCache.source !== 'google-api') await loadMangalyaDonors();

  const currentRow = donorCache.rows.find((row) => row.id === donorId);
  if (!currentRow) {
    const error = new Error('Donor row not found. Refresh data and try again.');
    error.statusCode = 404;
    throw error;
  }

  const data = Object.entries(updates || {})
    .filter(([field]) => Object.prototype.hasOwnProperty.call(DONOR_FIELDS, field))
    .map(([field, value]) => {
      const columnIndex = currentRow.adminColumns?.[field];
      if (columnIndex === null || columnIndex === undefined) return null;
      const column = columnLetter(columnIndex);
      const sheetName = getSheetName(DONOR_RANGE);
      return {
        range: `'${sheetName}'!${column}${currentRow.rowNumber}`,
        values: [[normalizeDonorPatchValue(field, value)]],
      };
    })
    .filter(Boolean);

  if (!data.length) {
    const error = new Error('No editable donor columns were provided.');
    error.statusCode = 400;
    throw error;
  }

  const sheets = createSheetsClient({ requireRegistrationSheets: false });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  return loadMangalyaDonors();
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MVST Events' });
});

app.get('/api/registrations', async (req, res) => {
  try {
    if (!cache.refreshedAt) await loadRegistrations();
    res.json({
      ok: true,
      rows: publicRows(cache.rows),
      refreshedAt: cache.refreshedAt,
      source: cache.source,
      writeEnabled: cache.writeEnabled,
      notice: cache.notice,
      mode: cache.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicRows(cache.rows),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.post('/api/registrations/refresh', async (req, res) => {
  try {
    const next = await loadRegistrations();
    res.json({
      ok: true,
      rows: publicRows(next.rows),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      notice: next.notice,
      mode: next.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicRows(cache.rows),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.patch('/api/registrations/:id', async (req, res) => {
  try {
    const next = await updateRegistration(req.params.id, req.body);
    res.json({
      ok: true,
      message: 'Saved to Google Sheet',
      rows: publicRows(next.rows),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      notice: next.notice,
      mode: 'read-write',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      rows: publicRows(cache.rows),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.get(['/api/mangalya-sponsorship', '/api/mangalya-donors'], async (req, res) => {
  try {
    if (!donorCache.refreshedAt) await loadMangalyaDonors();
    res.json({
      ok: true,
      rows: publicDonorRows(donorCache.rows),
      refreshedAt: donorCache.refreshedAt,
      source: donorCache.source,
      writeEnabled: donorCache.writeEnabled,
      notice: donorCache.notice,
      mode: donorCache.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicDonorRows(donorCache.rows),
      refreshedAt: donorCache.refreshedAt,
      writeEnabled: false,
      notice: donorCache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.post(['/api/mangalya-sponsorship/refresh', '/api/mangalya-donors/refresh'], async (req, res) => {
  try {
    const next = await loadMangalyaDonors();
    res.json({
      ok: true,
      rows: publicDonorRows(next.rows),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      notice: next.notice,
      mode: next.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicDonorRows(donorCache.rows),
      refreshedAt: donorCache.refreshedAt,
      writeEnabled: false,
      notice: donorCache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.get(['/api/sponsorship-requirements', '/api/sponsorship/requirements'], async (req, res) => {
  try {
    if (!requirementCache.refreshedAt) await loadSponsorshipRequirements();
    res.json({
      ok: true,
      rows: requirementCache.rows,
      refreshedAt: requirementCache.refreshedAt,
      source: requirementCache.source,
      writeEnabled: requirementCache.writeEnabled,
      notice: requirementCache.notice,
      mode: requirementCache.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: requirementCache.rows,
      refreshedAt: requirementCache.refreshedAt,
      writeEnabled: false,
      notice: requirementCache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.post(['/api/sponsorship-requirements/refresh', '/api/sponsorship/requirements/refresh'], async (req, res) => {
  try {
    const next = await loadSponsorshipRequirements();
    res.json({
      ok: true,
      rows: next.rows,
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      notice: next.notice,
      mode: next.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: requirementCache.rows,
      refreshedAt: requirementCache.refreshedAt,
      writeEnabled: false,
      notice: requirementCache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.patch(['/api/mangalya-sponsorship/:id', '/api/mangalya-donors/:id'], async (req, res) => {
  try {
    const next = await updateMangalyaDonor(req.params.id, req.body);
    res.json({
      ok: true,
      message: 'Saved to Google Sheet',
      rows: publicDonorRows(next.rows),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      notice: next.notice,
      mode: 'read-write',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      rows: publicDonorRows(donorCache.rows),
      refreshedAt: donorCache.refreshedAt,
      writeEnabled: false,
      notice: donorCache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.get('/api/whatsapp-group-config', async (req, res) => {
  try {
    const pstAdmins = await loadWhatsappPstAdmins();
    res.json({
      ok: true,
      canCreateGroupsDirectly: false,
      reason: 'WhatsApp click-to-chat links and WhatsApp Business Cloud API do not support direct group creation or admin assignment.',
      pstAdmins,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      canCreateGroupsDirectly: false,
      pstAdmins: [],
      error: error.message,
    });
  }
});

app.post('/api/whatsapp-groups', async (req, res) => {
  try {
    const { groupName, eventType, participantCount, status, remarks } = req.body || {};
    if (!groupName || !eventType) {
      return res.status(400).json({ ok: false, error: 'Group name and event are required.' });
    }

    const result = await appendWhatsappGroupLog({
      groupName,
      eventType,
      participantCount,
      status,
      remarks,
    });

    return res.json({
      ok: true,
      message: 'WhatsApp group status saved to private Google Sheet',
      group: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

if (fs.existsSync(indexPath)) {
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store');
          return;
        }

        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }

        res.setHeader('Cache-Control', 'public, max-age=3600');
      },
    }),
  );
  app.get(/.*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(indexPath);
  });
}

app.listen(PORT, () => {
  console.log(`MVST Events server listening on http://localhost:${PORT}`);
});
