import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo, isMongoConfigured } from './db/mongo.js';
import { DistributionLog } from './models/DistributionLog.js';
import { GeneralDonorAudit } from './models/GeneralDonorAudit.js';
import { GeneralDonorOperation } from './models/GeneralDonorOperation.js';
import { MangalyaDonorAudit } from './models/MangalyaDonorAudit.js';
import { MangalyaDonorOperation } from './models/MangalyaDonorOperation.js';
import { QrToken } from './models/QrToken.js';
import { Session } from './models/Session.js';
import { User } from './models/User.js';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const DEFAULT_RANGE = 'Form Responses 1!A:AZ';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');
const serviceAccountPath = path.join(projectRoot, 'service-account.json');
const authUsersPath = process.env.AUTH_USERS_FILE || path.join(projectRoot, 'server', 'data', 'users.json');
const SESSION_COOKIE = 'mvst_session';
const ROLE_PST = 'PST Admin';
const ROLE_VOLUNTEER = 'Volunteer';
const ROLE_CREW = 'Crew';
const AUTH_ROLES = [ROLE_PST, ROLE_VOLUNTEER, ROLE_CREW];
const SESSION_DURATIONS = {
  [ROLE_PST]: 12 * 60 * 60 * 1000,
  [ROLE_VOLUNTEER]: 8 * 60 * 60 * 1000,
  [ROLE_CREW]: 8 * 60 * 60 * 1000,
};
const sessions = new Map();
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
  qrToken: ['QR Token'],
  meetingAttendance: ['Meeting Attendance'],
  meetingAttendanceTime: ['Meeting Attendance Time', 'Meeting Attendance Date/Time'],
  meetingAttendanceBy: ['Meeting Attendance By'],
  eventAttendance: ['Event Attendance'],
  eventAttendanceTime: ['Event Attendance Time', 'Event Attendance Date/Time'],
  eventAttendanceBy: ['Event Attendance By'],
  madalakkiGiven: ['Madalakki Given'],
  madalakkiTime: ['Madalakki Time', 'Madalakki Date/Time'],
  madalakkiBy: ['Madalakki By', 'Madalakki Given By'],
  photoFrameGiven: ['Photo Frame Given'],
  photoFrameTime: ['Photo Frame Time', 'Photo Frame Date/Time'],
  photoFrameBy: ['Photo Frame By', 'Photo Frame Given By'],
};
const DONOR_FIELDS = {
  donorId: ['Donor ID'],
  sponsorName: ['Sponsor Name'],
  contactNo: ['Contact Number', 'Contact No'],
  eventYear: ['Event Year'],
  eventName: ['Event Name'],
  contributionType: ['Contribution Type'],
  category: ['Category', 'Sponsorship Category'],
  contributionNature: ['Contribution Nature'],
  previousDonationAmount: ['Previous Donation Amount', 'Previous Donation', 'Last Donation Amount', 'Donation Amount'],
  previousDonationYear: ['Previous Donation Year', 'Last Donation Year', 'Last Donated Year'],
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
  treasurerVerified: ['Treasurer Verified', 'Payment Verified', 'Verified By Treasurer'],
  remarks: ['Remarks'],
  introducedBy: ['Trustee Reference', 'Introduced By / Trustee Reference', 'Introduced By'],
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
  receiptNumber: ['Receipt Number', 'Receipt No', 'Mangalya Receipt No'],
};
const DONOR_RANGE = sponsorshipRange(process.env.MANGALYA_SPONSORSHIP_RANGE || process.env.SPONSORSHIP_CONTRIBUTIONS_RANGE || "'Sponsorship Contributions'!A:AZ");
const REQUIREMENT_RANGE = process.env.SPONSORSHIP_REQUIREMENTS_RANGE || "'Sponsorship Requirements'!A:O";
const WHATSAPP_PST_ADMINS_RANGE = process.env.WHATSAPP_PST_ADMINS_RANGE || "'WhatsApp PST Admins'!A:B";
const WHATSAPP_GROUP_LOG_RANGE = process.env.WHATSAPP_GROUP_LOG_RANGE || "'WhatsApp Group Log'!A:F";
const WHATSAPP_GROUP_LOG_HEADERS = ['Group Name', 'Event', 'Creation Date', 'Participant Count', 'Status', 'Remarks'];
const MANDALI_CONTACTS_CSV = process.env.MANDALI_CONTACTS_CSV || path.join(projectRoot, 'server', 'private-data', 'bangalore-arya-vysya-mandali-final.csv');
const FREE_SPONSORSHIP_STATUS = 'free sponsorship';
const QR_TOKEN_VERSION = 'mvstqr:v1';
const MANGALYA_EVENT_YEAR = process.env.MANGALYA_EVENT_YEAR || process.env.VITE_ACTIVE_EVENT_YEAR || '2026';
const MANGALYA_RATE = 15000;
const MANGALYA_QR_PREFIX = '/qr/mangalya/';
const PUBLIC_PORTAL_ORIGIN = (process.env.PUBLIC_PORTAL_ORIGIN || process.env.VITE_PUBLIC_PORTAL_ORIGIN || process.env.VITE_PUBLIC_APP_URL || 'https://mvst-events.onrender.com').replace(/\/+$/, '');
const DISTRIBUTION_OPERATIONS = {
  meetingAttendance: {
    label: 'Meeting Attendance',
    statusField: 'meetingAttendance',
    timeField: 'meetingAttendanceTime',
    byField: 'meetingAttendanceBy',
  },
  kitCollection: {
    label: 'Kit Collection',
    statusField: 'kitIssued',
    remarkField: 'remarks',
  },
  eventAttendance: {
    label: 'Event Attendance',
    statusField: 'eventAttendance',
    timeField: 'eventAttendanceTime',
    byField: 'eventAttendanceBy',
  },
  madalakkiDistribution: {
    label: 'Madalakki Distribution',
    statusField: 'madalakkiGiven',
    timeField: 'madalakkiTime',
    byField: 'madalakkiBy',
  },
  photoFrameDistribution: {
    label: 'Photo Frame Distribution',
    statusField: 'photoFrameGiven',
    timeField: 'photoFrameTime',
    byField: 'photoFrameBy',
  },
};

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
const RECEIPT_PREFIXES = {
  bhimaratha: 'BS',
  shashtipoorthi: 'SP',
};
const LEGACY_RECEIPT_PREFIXES = {
  bhimaratha: 'BS26',
  shashtipoorthi: 'SP26',
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
  sheetRowsLoaded: 0,
  appRowsLoaded: 0,
  rowDifference: 0,
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

function lettersToNumber(letters) {
  return String(letters || '').toUpperCase().split('').reduce(
    (value, letter) => value * 26 + (letter.charCodeAt(0) - 64),
    0,
  );
}

function numberToLetters(value) {
  let number = Number(value || 0);
  let letters = '';
  while (number > 0) {
    number -= 1;
    letters = String.fromCharCode(65 + (number % 26)) + letters;
    number = Math.floor(number / 26);
  }
  return letters || 'A';
}

function parseSeatValue(seatNo) {
  const match = String(seatNo || '').trim().toUpperCase().match(/^([A-Z]+)\s*-?\s*(\d{1,2})$/);
  if (!match) return null;
  const rowNumber = lettersToNumber(match[1]);
  const seatNumber = Number(match[2]);
  if (!rowNumber || seatNumber < 1 || seatNumber > 6) return null;
  return {
    row: match[1],
    rowNumber,
    seatNumber,
    normalized: `${match[1]}-${String(seatNumber).padStart(2, '0')}`,
    rank: rowNumber * 100 + seatNumber,
  };
}

function nextSeatAfter(parsedSeat) {
  if (!parsedSeat) return 'A-01';
  const nextRowNumber = parsedSeat.seatNumber >= 6 ? parsedSeat.rowNumber + 1 : parsedSeat.rowNumber;
  const nextSeatNumber = parsedSeat.seatNumber >= 6 ? 1 : parsedSeat.seatNumber + 1;
  return `${numberToLetters(nextRowNumber)}-${String(nextSeatNumber).padStart(2, '0')}`;
}

function nextAvailableSeat(rows, eventType) {
  const parsedSeats = rows
    .filter((row) => row.eventType === eventType)
    .map((row) => parseSeatValue(row.seatNo))
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank);
  return nextSeatAfter(parsedSeats[0]);
}

function receiptPrefix(eventType) {
  return RECEIPT_PREFIXES[eventType] || 'RC26';
}

function receiptNumericValue(receiptNo, eventType) {
  const raw = String(receiptNo || '').trim();
  const prefixes = [receiptPrefix(eventType), LEGACY_RECEIPT_PREFIXES[eventType]].filter(Boolean).join('|');
  const match = raw.match(new RegExp(`^(?:${prefixes})-(\\d{1,3})$`));
  return match ? Number(match[1]) : null;
}

function nextAvailableReceiptNo(rows, eventType) {
  const highest = rows
    .filter((row) => row.eventType === eventType)
    .reduce((max, row) => Math.max(max, receiptNumericValue(row.receiptNo, eventType) || 0), 0);
  return `${receiptPrefix(eventType)}-${String(highest + 1).padStart(2, '0')}`;
}

function formatReceiptNo(eventType, number) {
  return `${receiptPrefix(eventType)}-${String(Number(number)).padStart(2, '0')}`;
}

function receiptQrEventCode(eventType) {
  return eventType === 'bhimaratha' ? 'BS' : eventType === 'shashtipoorthi' ? 'SP' : '';
}

function eventTypeFromQrCode(eventCode) {
  const code = String(eventCode || '').trim().toUpperCase();
  if (code === 'BS') return 'bhimaratha';
  if (code === 'SP') return 'shashtipoorthi';
  return '';
}

function formatReceiptNoForQr(eventType, receiptNo) {
  const value = receiptNumericValue(receiptNo, eventType);
  const eventCode = receiptQrEventCode(eventType);
  if (!eventCode || value === null || value < 1 || value > 30) return '';
  return `${eventCode}-${String(value).padStart(2, '0')}`;
}

function parseFixedSeatNumber(seatNo) {
  const raw = String(seatNo || '').trim().toUpperCase();
  const match = raw.match(/^([A-E])\s*[- ]\s*(0?[1-6])$/);
  if (!match) return null;
  const rowIndex = match[1].charCodeAt(0) - 65;
  const seatIndex = Number(match[2]);
  return {
    normalized: `${match[1]}-${String(seatIndex).padStart(2, '0')}`,
    number: rowIndex * 6 + seatIndex,
  };
}

function validateReceiptSeatMappingForQr({ eventType, receiptNo, seatNo }) {
  const receiptValue = receiptNumericValue(receiptNo, eventType);
  const seat = parseFixedSeatNumber(seatNo);
  const eventCode = receiptQrEventCode(eventType);
  if (!eventCode) return { ok: false, reason: 'Event must resolve to BS or SP.' };
  if (receiptValue === null || receiptValue < 1 || receiptValue > 30) {
    return { ok: false, reason: 'Receipt No. must be in the range 01-30.' };
  }
  if (!seat) return { ok: false, reason: 'Seat No. must be in the range A-01 to E-06.' };
  if (receiptValue !== seat.number) {
    return {
      ok: false,
      reason: 'Receipt No. and Seat No. do not match the approved sequence. QR generation stopped.',
    };
  }
  return {
    ok: true,
    eventCode,
    receiptNo: formatReceiptNoForQr(eventType, receiptNo),
    seatNo: seat.normalized,
    qrToken: `MVST|${eventCode}|${formatReceiptNoForQr(eventType, receiptNo)}|${seat.normalized}`,
  };
}

function receiptQrPortalUrl(qrToken) {
  return `${PUBLIC_PORTAL_ORIGIN}/qr/receipt?token=${encodeURIComponent(qrToken)}`;
}

function extractFixedReceiptQrToken(rawToken) {
  const raw = String(rawToken || '').trim();
  if (!raw) return '';
  if (raw.startsWith('MVST|')) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.searchParams.get('token') || raw;
  } catch {
    return raw;
  }
}

function parseFixedReceiptQr(rawToken) {
  const parts = extractFixedReceiptQrToken(rawToken).split('|').map((part) => part.trim());
  if (parts.length !== 4 || parts[0] !== 'MVST') return null;
  const eventType = eventTypeFromQrCode(parts[1]);
  if (!eventType) return null;
  const validation = validateReceiptSeatMappingForQr({
    eventType,
    receiptNo: parts[2],
    seatNo: parts[3],
  });
  if (!validation.ok) return { eventType, receiptNo: parts[2], seatNo: parts[3], validation };
  return {
    eventType,
    receiptNo: validation.receiptNo,
    receiptNumber: receiptNumericValue(validation.receiptNo, eventType),
    seatNo: validation.seatNo,
    qrUrl: receiptQrPortalUrl(validation.qrToken),
    validation,
  };
}

function timestampValue(timestamp) {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;
  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) return direct;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const parsed = new Date(year, month, day, hour, minute, second).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function sortReceiptSequenceRows(rows) {
  return [...rows].sort((a, b) => {
    const timeA = timestampValue(a.timestamp);
    const timeB = timestampValue(b.timestamp);
    if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
    if (timeA !== null && timeB === null) return -1;
    if (timeA === null && timeB !== null) return 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

function suggestedReceiptNoForRow(rows, currentRow) {
  const existing = receiptNumericValue(currentRow.receiptNo, currentRow.eventType);
  if (existing) return formatReceiptNo(currentRow.eventType, existing);
  const eventRows = sortReceiptSequenceRows(
    rows.filter((row) => row.eventType === currentRow.eventType),
  );
  const usedNumbers = new Set(
    eventRows
      .map((row) => receiptNumericValue(row.receiptNo, currentRow.eventType))
      .filter(Boolean),
  );
  let nextNumber = 1;
  for (const row of eventRows) {
    if (receiptNumericValue(row.receiptNo, currentRow.eventType)) continue;
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const suggestion = formatReceiptNo(currentRow.eventType, nextNumber);
    usedNumbers.add(nextNumber);
    if (row.id === currentRow.id) return suggestion;
  }
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return formatReceiptNo(currentRow.eventType, nextNumber);
}

function isReceiptEligible(row) {
  return (
    String(row.paymentStatus || '').trim() === 'Full Paid' &&
    Number(row.balance || 0) === 0 &&
    !isFreeSponsorshipStatus(row.paymentStatus)
  );
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

function requiredDistributionColumns() {
  return [
    ...Object.values(DISTRIBUTION_OPERATIONS).flatMap((operation) => [
      operation.statusField,
      operation.timeField,
      operation.byField,
      operation.remarkField,
    ].filter(Boolean)),
  ];
}

function missingDistributionColumns(rows) {
  const missingByEvent = {};
  for (const eventType of Object.keys(EVENTS)) {
    const sample = rows.find((row) => row.eventType === eventType);
    const adminColumns = sample?.adminColumns || {};
    missingByEvent[eventType] = requiredDistributionColumns()
      .filter((field) => adminColumns[field] === null || adminColumns[field] === undefined)
      .map((field) => ADMIN_FIELDS[field]?.[0] || field);
  }
  return missingByEvent;
}

function generateQrToken() {
  return `MVST_${crypto.randomBytes(15).toString('base64url')}`;
}

function rowQrToken(row) {
  return String(row.qrToken || '').trim();
}

async function ensureStoredQrTokens(rows, sheets) {
  const usedTokens = new Set(rows.map(rowQrToken).filter(Boolean));
  const updatesBySpreadsheet = new Map();

  for (const row of rows) {
    if (rowQrToken(row)) continue;
    const columnIndex = row.adminColumns?.qrToken;
    if (columnIndex === null || columnIndex === undefined) continue;

    let token = generateQrToken();
    while (usedTokens.has(token)) token = generateQrToken();
    usedTokens.add(token);
    row.qrToken = token;

    const source = sourceForEvent(row.eventType);
    if (!source?.spreadsheetId) continue;
    const data = updatesBySpreadsheet.get(source.spreadsheetId) || [];
    data.push({
      range: `'${getSheetName()}'!${columnLetter(columnIndex)}${row.rowNumber}`,
      values: [[token]],
    });
    updatesBySpreadsheet.set(source.spreadsheetId, data);
  }

  for (const [spreadsheetId, data] of updatesBySpreadsheet.entries()) {
    if (!data.length) continue;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data,
      },
    });
  }

  return updatesBySpreadsheet.size > 0;
}

async function recordQrToken(row) {
  if (!isMongoConfigured() || !row?.id) return;
  try {
    const validation = validateReceiptSeatMappingForQr({
      eventType: row.eventType,
      receiptNo: row.receiptNo,
      seatNo: row.seatNo,
    });
    const tokenValue = validation.ok ? validation.qrToken : rowQrToken(row);
    if (!tokenValue) return;
    await connectMongo();
    await QrToken.updateOne(
      { participantId: row.id },
      {
        $set: {
          tokenHash: tokenHash(tokenValue),
          tokenVersion: QR_TOKEN_VERSION,
          participantId: row.id,
          eventType: row.eventType,
          rowNumber: row.rowNumber || null,
          active: true,
        },
      },
      { upsert: true },
    );
  } catch {
    // QR token persistence is optional infrastructure; Sheets remains the source of truth.
  }
}

async function recordDistributionLog({ row, operationKey, status, operatorUser }) {
  if (!isMongoConfigured() || !row?.id || !operatorUser?.id) return;
  try {
    await connectMongo();
    await DistributionLog.create({
      participantId: row.id,
      eventType: row.eventType,
      rowNumber: row.rowNumber || null,
      operation: operationKey,
      status,
      operatorUserId: operatorUser.id,
      operatorName: operatorUser.name || operatorUser.mobile,
      occurredAt: new Date(),
    });
  } catch {
    // Distribution logs are supplemental; do not undo or mask confirmed Sheet writes.
  }
}

function indiaDateTime() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function normalizeMobileForAuth(rawMobile) {
  const digits = String(rawMobile || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

function sanitizeAuthUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    active: user.active !== false,
    lastLogin: user.lastLogin || '',
    mustChangePassword: Boolean(user.mustChangePassword),
    passwordChangedAt: user.passwordChangedAt || '',
    passwordAudit: Array.isArray(user.passwordAudit)
      ? user.passwordAudit.map((entry) => ({
        action: entry.action || '',
        changedBy: entry.changedBy || '',
        changedByName: entry.changedByName || '',
        at: entry.at || '',
      }))
      : [],
  };
}

function storageRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === ROLE_PST) return 'PST_ADMIN';
  if (normalized === ROLE_CREW) return 'CREW';
  return 'VOLUNTEER';
}

function displayRole(role) {
  const raw = String(role || '').trim();
  if (raw === 'PST_ADMIN') return ROLE_PST;
  if (raw === 'CREW') return ROLE_CREW;
  if (raw === 'VOLUNTEER') return ROLE_VOLUNTEER;
  return normalizeRole(raw);
}

function normalizeAuthRecord(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ''),
    name: user.name || '',
    mobile: user.mobile || '',
    role: displayRole(user.role),
    active: user.active !== false,
    passwordHash: user.pinHash || user.passwordHash || '',
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
    mustChangePassword: Boolean(user.mustChangePassword),
    passwordChangedAt: user.passwordChangedAt ? new Date(user.passwordChangedAt).toISOString() : '',
    passwordAudit: Array.isArray(user.passwordAudit) ? user.passwordAudit : [],
  };
}

function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase();
  if (raw === 'pst' || raw === 'pst admin' || raw === 'admin') return ROLE_PST;
  if (raw === 'pst_admin') return ROLE_PST;
  if (raw === 'volunteer') return ROLE_VOLUNTEER;
  if (raw === 'crew') return ROLE_CREW;
  return ROLE_VOLUNTEER;
}

function validatePin(pin) {
  return /^\d{4}$|^\d{6}$/.test(String(pin || ''));
}

function validatePassword(password) {
  return String(password || '').length >= 4;
}

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('base64url');
  return `scrypt:v1:${salt}:${hash}`;
}

function verifyPin(pin, storedHash) {
  const [scheme, version, salt, expectedHash] = String(storedHash || '').split(':');
  if (scheme !== 'scrypt' || version !== 'v1' || !salt || !expectedHash) return false;
  const actual = crypto.scryptSync(String(pin), salt, 32);
  const expected = Buffer.from(expectedHash, 'base64url');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function readAuthUsers() {
  try {
    if (!fs.existsSync(authUsersPath)) return [];
    return JSON.parse(fs.readFileSync(authUsersPath, 'utf8')).users || [];
  } catch {
    return [];
  }
}

function writeAuthUsers(users) {
  fs.mkdirSync(path.dirname(authUsersPath), { recursive: true });
  fs.writeFileSync(authUsersPath, JSON.stringify({ users }, null, 2));
}

async function listAuthUsers() {
  if (isMongoConfigured()) {
    await connectMongo();
    const users = await User.find({}).sort({ createdAt: 1 }).lean();
    return users.map(normalizeAuthRecord);
  }
  return readAuthUsers().map(normalizeAuthRecord);
}

async function findAuthUserByMobile(mobile) {
  const normalizedMobile = normalizeMobileForAuth(mobile);
  if (isMongoConfigured()) {
    await connectMongo();
    return normalizeAuthRecord(await User.findOne({ mobile: normalizedMobile }).lean());
  }
  return readAuthUsers().map(normalizeAuthRecord).find((user) => user.mobile === normalizedMobile) || null;
}

async function createAuthUserRecord({ name, mobile, role, pin }) {
  const record = {
    name: String(name || 'Volunteer').trim(),
    mobile: normalizeMobileForAuth(mobile),
    role: normalizeRole(role),
    active: true,
    passwordHash: hashPin(pin),
    lastLogin: '',
    mustChangePassword: true,
    passwordChangedAt: '',
    passwordAudit: [{
      action: 'Created temporary password',
      changedBy: 'system',
      changedByName: 'System',
      at: new Date().toISOString(),
    }],
  };
  if (isMongoConfigured()) {
    await connectMongo();
    const user = await User.create({
      name: record.name,
      mobile: record.mobile,
      role: storageRole(record.role),
      active: true,
      pinHash: record.passwordHash,
      mustChangePassword: true,
      passwordAudit: record.passwordAudit,
    });
    return normalizeAuthRecord(user.toObject());
  }
  const users = readAuthUsers().map(normalizeAuthRecord);
  if (users.some((user) => user.mobile === record.mobile)) {
    const error = new Error('Mobile already exists');
    error.statusCode = 409;
    throw error;
  }
  const nextUser = { ...record, id: crypto.randomUUID() };
  writeAuthUsers([...users, nextUser]);
  return nextUser;
}

async function updateAuthUserRecord(id, updates) {
  if (isMongoConfigured()) {
    await connectMongo();
    const patch = {};
    if (updates.name !== undefined) patch.name = String(updates.name || '').trim();
    if (updates.role !== undefined) patch.role = storageRole(updates.role);
    if (updates.active !== undefined) patch.active = Boolean(updates.active);
    if (updates.pin !== undefined) {
      patch.pinHash = hashPin(updates.pin);
      patch.passwordChangedAt = new Date();
      if (updates.mustChangePassword !== undefined) patch.mustChangePassword = Boolean(updates.mustChangePassword);
    } else if (updates.mustChangePassword !== undefined) {
      patch.mustChangePassword = Boolean(updates.mustChangePassword);
    }
    const push = updates.passwordAudit ? { passwordAudit: updates.passwordAudit } : undefined;
    const update = push ? { $set: patch, $push: push } : { $set: patch };
    const user = await User.findByIdAndUpdate(id, update, { new: true }).lean();
    return normalizeAuthRecord(user);
  }
  const users = readAuthUsers().map(normalizeAuthRecord);
  const nextUsers = users.map((user) => {
    if (user.id !== id) return user;
    const next = { ...user };
    if (updates.name !== undefined) next.name = String(updates.name || '').trim();
    if (updates.role !== undefined) next.role = normalizeRole(updates.role);
    if (updates.active !== undefined) next.active = Boolean(updates.active);
    if (updates.pin !== undefined) {
      next.passwordHash = hashPin(updates.pin);
      next.passwordChangedAt = new Date().toISOString();
      if (updates.mustChangePassword !== undefined) next.mustChangePassword = Boolean(updates.mustChangePassword);
    } else if (updates.mustChangePassword !== undefined) {
      next.mustChangePassword = Boolean(updates.mustChangePassword);
    }
    if (updates.passwordAudit) next.passwordAudit = [...(next.passwordAudit || []), updates.passwordAudit];
    return next;
  });
  writeAuthUsers(nextUsers);
  return nextUsers.find((user) => user.id === id) || null;
}

function passwordAuditEntry(action, changedBy) {
  return {
    action,
    changedBy: changedBy?.id || 'system',
    changedByName: changedBy?.name || 'System',
    at: new Date().toISOString(),
  };
}

async function changeOwnPassword(user, currentPassword, newPassword) {
  const currentUser = await findAuthUserByMobile(user?.mobile);
  if (!currentUser || !verifyPin(currentPassword, currentUser.passwordHash)) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 400;
    throw error;
  }
  if (!validatePassword(newPassword)) {
    const error = new Error('New password must be at least 4 characters.');
    error.statusCode = 400;
    throw error;
  }
  await updateAuthUserRecord(currentUser.id, {
    pin: newPassword,
    mustChangePassword: false,
    passwordAudit: passwordAuditEntry('User changed own password', currentUser),
  });
  if (isMongoConfigured()) {
    await connectMongo();
    await Session.deleteMany({ userId: currentUser.id });
  } else {
    for (const [sessionId, session] of sessions.entries()) {
      if (session?.user?.id === currentUser.id) sessions.delete(sessionId);
    }
  }
}

async function resetUserPassword(targetUserId, newPassword, changedBy) {
  if (!validatePassword(newPassword)) {
    const error = new Error('New password must be at least 4 characters.');
    error.statusCode = 400;
    throw error;
  }
  const user = await updateAuthUserRecord(targetUserId, {
    pin: newPassword,
    mustChangePassword: true,
    passwordAudit: passwordAuditEntry('PST reset password', changedBy),
  });
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  if (isMongoConfigured()) {
    await connectMongo();
    await Session.deleteMany({ userId: user.id });
  } else {
    for (const [sessionId, session] of sessions.entries()) {
      if (session?.user?.id === user.id) sessions.delete(sessionId);
    }
  }
  return user;
}

async function updateLastLogin(userId, date) {
  if (isMongoConfigured()) {
    await connectMongo();
    await User.findByIdAndUpdate(userId, { lastLogin: date });
    return;
  }
  const users = readAuthUsers().map(normalizeAuthRecord);
  writeAuthUsers(users.map((user) => (user.id === userId ? { ...user, lastLogin: date.toISOString() } : user)));
}

async function ensureBootstrapUser() {
  const users = await listAuthUsers();
  if (users.length || !process.env.AUTH_BOOTSTRAP_ADMIN_MOBILE || !process.env.AUTH_BOOTSTRAP_ADMIN_PIN) return users;
  if (!validatePin(process.env.AUTH_BOOTSTRAP_ADMIN_PIN)) return users;
  await createAuthUserRecord({
    name: process.env.AUTH_BOOTSTRAP_ADMIN_NAME || 'PST Admin',
    mobile: process.env.AUTH_BOOTSTRAP_ADMIN_MOBILE,
    role: ROLE_PST,
    pin: process.env.AUTH_BOOTSTRAP_ADMIN_PIN,
  });
  return listAuthUsers();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function cookieOptions(req, maxAge) {
  const secure = process.env.NODE_ENV === 'production' || req.secure || req.get('x-forwarded-proto') === 'https';
  return [
    `HttpOnly`,
    `SameSite=Lax`,
    `Path=/`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function setSessionCookie(req, res, sessionId, maxAge) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; ${cookieOptions(req, maxAge)}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const duration = SESSION_DURATIONS[user.role] || SESSION_DURATIONS[ROLE_VOLUNTEER];
  const expiresAt = new Date(Date.now() + duration);
  if (isMongoConfigured()) {
    await connectMongo();
    await Session.create({
      tokenHash: tokenHash(sessionId),
      userId: user.id,
      loginAt: new Date(),
      expiresAt,
      lastActivity: new Date(),
    });
    return { sessionId, duration };
  }
  sessions.set(sessionId, {
    user: sanitizeAuthUser(user),
    expiresAt: expiresAt.getTime(),
  });
  return { sessionId, duration };
}

async function authFromRequest(req) {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (isMongoConfigured()) {
    await connectMongo();
    const session = sessionId ? await Session.findOne({ tokenHash: tokenHash(sessionId) }).lean() : null;
    if (!session) return null;
    if (Date.now() > new Date(session.expiresAt).getTime()) {
      await Session.deleteOne({ _id: session._id });
      return null;
    }
    const user = normalizeAuthRecord(await User.findOne({ _id: session.userId, active: true }).lean());
    if (!user) return null;
    await Session.updateOne({ _id: session._id }, { lastActivity: new Date() });
    return sanitizeAuthUser(user);
  }
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session.user;
}

async function requireAuth(req, res, next) {
  try {
    const user = await authFromRequest(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Authentication unavailable' });
  }
}

async function requirePst(req, res, next) {
  try {
    const user = await authFromRequest(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    if (user.role !== ROLE_PST) return res.status(403).json({ ok: false, error: 'Forbidden' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Authentication unavailable' });
  }
}

function isPstUser(user) {
  return user?.role === ROLE_PST;
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
        receiptDate: getCell(row, headerMap, ['Receipt Date']),
        receiptGenerated: boolFrom(getCell(row, headerMap, ['Receipt Generated'])),
        qrToken: getCell(row, headerMap, ['QR Token']),
        meetingAttendance: boolFrom(getCell(row, headerMap, ['Meeting Attendance'])),
        meetingAttendanceTime: getCell(row, headerMap, ['Meeting Attendance Time', 'Meeting Attendance Date/Time']),
        meetingAttendanceBy: getCell(row, headerMap, ['Meeting Attendance By']),
        eventAttendance: boolFrom(getCell(row, headerMap, ['Event Attendance'])),
        eventAttendanceTime: getCell(row, headerMap, ['Event Attendance Time', 'Event Attendance Date/Time']),
        eventAttendanceBy: getCell(row, headerMap, ['Event Attendance By']),
        madalakkiGiven: boolFrom(getCell(row, headerMap, ['Madalakki Given'])),
        madalakkiTime: getCell(row, headerMap, ['Madalakki Time', 'Madalakki Date/Time']),
        madalakkiBy: getCell(row, headerMap, ['Madalakki By', 'Madalakki Given By']),
        photoFrameGiven: boolFrom(getCell(row, headerMap, ['Photo Frame Given'])),
        photoFrameTime: getCell(row, headerMap, ['Photo Frame Time', 'Photo Frame Date/Time']),
        photoFrameBy: getCell(row, headerMap, ['Photo Frame By', 'Photo Frame Given By']),
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
      const contributionType = getCell(row, headerMap, ['Contribution Type']);
      const previousDonationAmount = numberFrom(getCell(row, headerMap, [
        'Previous Donation Amount',
        'Previous Donation',
        'Last Donation Amount',
        'Donation Amount',
      ]));
      const appealSent = boolFrom(getCell(row, headerMap, ['Appeal Sent', 'WhatsApp Sent']));
      const appealSentDate = getCell(row, headerMap, ['Appeal Sent Date', 'Sent Date']);
      const donorId = normalizeMangalyaDonorId(getCell(row, headerMap, ['Donor ID']));
      return {
        id: donorId || `missing-donor-id:${rowNumber}`,
        donorId,
        rowNumber,
        slNo: getCell(row, headerMap, ['Sl No', 'Sl. No.']),
        sponsorName: getCell(row, headerMap, ['Sponsor Name', 'Mangalya Donor']),
        donorName: getCell(row, headerMap, ['Sponsor Name', 'Mangalya Donor']),
        contactNo: getCell(row, headerMap, ['Contact Number', 'Contact No']),
        eventYear: getCell(row, headerMap, ['Event Year']),
        eventName: getCell(row, headerMap, ['Event Name']),
        contributionType,
        category,
        canonicalCategory: canonicalCategory(category),
        contributionNature: getCell(row, headerMap, ['Contribution Nature']) || 'Monetary',
        previousDonationAmount,
        previousDonationYear: getCell(row, headerMap, ['Previous Donation Year', 'Last Donation Year', 'Last Donated Year']),
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
        treasurerVerified: boolFrom(getCell(row, headerMap, ['Treasurer Verified', 'Payment Verified', 'Verified By Treasurer'])),
        remarks: getCell(row, headerMap, ['Remarks']),
        introducedBy: getCell(row, headerMap, ['Trustee Reference', 'Introduced By / Trustee Reference', 'Introduced By']),
        followUpBy: getCell(row, headerMap, ['Follow-up By', 'Follow Up By']),
        collectedBy: getCell(row, headerMap, ['Collected By']),
        invitationHandedOverBy: getCell(row, headerMap, ['Invitation Handed Over By']),
        paymentMode: getCell(row, headerMap, ['Payment Mode', 'Contribution Mode']),
        bankOrCash: getCell(row, headerMap, ['Bank / Cash', 'Bank Cash']),
        transactionReference: getCell(row, headerMap, ['Transaction Reference / UTR / Cheque No', 'Transaction Reference', 'UTR', 'Cheque No']),
        paymentDate: getCell(row, headerMap, ['Payment Date', 'Received Date']),
        paymentProofLink: getCell(row, headerMap, ['Payment Proof Link']),
        receiptNumber: getCell(row, headerMap, ['Receipt Number', 'Receipt No', 'Mangalya Receipt No']),
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

  const readRows = async () => Promise.all(
    SHEETS.map(async (source) => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: source.spreadsheetId,
        range,
      });
      return normalizeRows(response.data.values, source);
    }),
  );

  const results = await readRows();
  const rows = results.flat();

  return {
    rows,
    source: 'google-api',
    writeEnabled: true,
    sheetRowsLoaded: rows.length,
    appRowsLoaded: rows.length,
    rowDifference: 0,
  };
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
    sheetRowsLoaded: results.flat().length,
    appRowsLoaded: results.flat().length,
    rowDifference: 0,
    notice:
      'Google public CSV may take a few minutes to update. For instant updates, enable Google Sheets API service account.',
  };
}

function publicRows(rows, user = null) {
  return rows.map(({ adminColumns, ...row }) => {
    if (!isPstUser(user)) {
      return {
        id: row.id,
        rowNumber: row.rowNumber,
        eventType: row.eventType,
        sourceLabel: row.sourceLabel,
        timestamp: row.timestamp,
        groomName: row.groomName,
        brideName: row.brideName,
        mobileNumber: row.mobileNumber,
        seatNo: row.seatNo,
        meetingAttendance: row.meetingAttendance,
        meetingAttendanceTime: row.meetingAttendanceTime,
        meetingAttendanceBy: row.meetingAttendanceBy,
        kitIssued: row.kitIssued,
        eventAttendance: row.eventAttendance,
        eventAttendanceTime: row.eventAttendanceTime,
        eventAttendanceBy: row.eventAttendanceBy,
        madalakkiGiven: row.madalakkiGiven,
        madalakkiTime: row.madalakkiTime,
        madalakkiBy: row.madalakkiBy,
        photoFrameGiven: row.photoFrameGiven,
        photoFrameTime: row.photoFrameTime,
        photoFrameBy: row.photoFrameBy,
      };
    }
    return {
      ...row,
      qrToken: rowQrToken(row),
    };
  });
}

function publicDonorRows(rows) {
  return rows.map(({ adminColumns, ...row }) => row);
}

function normalizeMangalyaReceiptNumber(value) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/^M\s*-?\s*(\d{1,3})$/);
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1 || number > 999) return '';
  return `M${String(number).padStart(3, '0')}`;
}

function normalizeMangalyaDonorId(value) {
  const raw = String(value || '').trim().toUpperCase();
  const match = raw.match(/^MD26-(\d{4})$/);
  return match ? `MD26-${match[1]}` : '';
}

function donorIdentityError() {
  const error = new Error('Donor record identity is missing or duplicated. No changes were saved.');
  error.statusCode = 409;
  return error;
}

function donorPaymentVerified(donor) {
  const status = String(donor?.status || donor?.paymentStatus || '').trim().toLowerCase();
  return Boolean(donor?.treasurerVerified) || status.includes('received');
}

function mangalyaDonorQuantity(donor) {
  const quantity = Number(
    donor?.confirmedQuantity ||
      donor?.sponsored2026 ||
      donor?.receivedQuantity ||
      donor?.sponsored2025 ||
      0,
  );
  return Number.isInteger(quantity) && quantity >= 1 ? quantity : 0;
}

function mangalyaDonorTotal(donor) {
  return mangalyaDonorQuantity(donor) * MANGALYA_RATE;
}

function donorEventYear(donor) {
  return String(donor?.eventYear || MANGALYA_EVENT_YEAR || '2026').trim();
}

function donorSheetReceiptNumber(donor) {
  return normalizeMangalyaReceiptNumber(donor?.receiptNumber);
}

function actorName(user) {
  return String(user?.name || user?.mobile || 'Unknown User').trim();
}

function publicOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'mvst-events.onrender.com';
  return `${proto}://${host}`;
}

function createMangalyaToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function maskForVolunteer(rawMobile) {
  const digits = String(rawMobile || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}

function isTreasurerOrPst(user) {
  return isPstUser(user);
}

async function recordMangalyaAudit({ donorSourceId, eventYear, eventType, user, remarks = '' }) {
  if (!isMongoConfigured()) return;
  await connectMongo();
  await MangalyaDonorAudit.create({
    eventYear,
    donorSourceId,
    eventType,
    actorUserId: String(user?.id || ''),
    actorName: actorName(user),
    remarks,
  });
}

async function recordGeneralDonorAudit({ donorSourceId, eventYear, eventType, user, remarks = '' }) {
  if (!isMongoConfigured()) return;
  await connectMongo();
  await GeneralDonorAudit.create({
    eventYear,
    donorSourceId,
    eventType,
    actorUserId: String(user?.id || ''),
    actorName: actorName(user),
    remarks,
  });
}

function isGeneralPreviousDonor(row) {
  const typeText = [row.contributionType, row.category, row.canonicalCategory].join(' ').toLowerCase();
  return Number(row.previousDonationAmount || 0) > 0 && !typeText.includes('mangalya donor') && !typeText.includes('mangalya');
}

function generalDonorSourceId(row) {
  if (row?.donorId) return row.donorId;
  const year = donorEventYear(row);
  if (row?.rowNumber) return `PD-${year}-ROW-${row.rowNumber}`;
  return '';
}

function donorMatchesPatchId(row, donorId) {
  if (row?.donorId === donorId) return true;
  return isGeneralPreviousDonor(row) && (row?.id === donorId || generalDonorSourceId(row) === donorId);
}

async function loadMangalyaOperationsForRows(rows) {
  const identifiedRows = rows.filter((row) => row.donorId);
  if (!isMongoConfigured() || !identifiedRows.length) return new Map();
  await connectMongo();
  const keys = identifiedRows.map((row) => ({
    eventYear: donorEventYear(row),
    donorSourceId: row.donorId,
  }));
  const operations = await MangalyaDonorOperation.find({
    $or: keys,
  }).lean();
  return new Map(operations.map((operation) => [`${operation.eventYear}:${operation.donorSourceId}`, operation]));
}

async function loadGeneralDonorOperationsForRows(rows) {
  const identifiedRows = rows.filter((row) => generalDonorSourceId(row) && isGeneralPreviousDonor(row));
  if (!isMongoConfigured() || !identifiedRows.length) return new Map();
  await connectMongo();
  const keys = identifiedRows.map((row) => ({
    eventYear: donorEventYear(row),
    donorSourceId: generalDonorSourceId(row),
  }));
  const operations = await GeneralDonorOperation.find({
    $or: keys,
  }).lean();
  return new Map(operations.map((operation) => [`${operation.eventYear}:${operation.donorSourceId}`, operation]));
}

function mergeMangalyaOperations(rows, operationsMap) {
  return rows.map((row) => {
    const operation = row.donorId ? operationsMap.get(`${donorEventYear(row)}:${row.donorId}`) || {} : {};
    const receiptNumber = normalizeMangalyaReceiptNumber(row.receiptNumber) ||
      normalizeMangalyaReceiptNumber(operation.receiptNumber);
    const quantity = mangalyaDonorQuantity(row);
    return {
      ...row,
      donorType: 'MANGALYA',
      eventYear: donorEventYear(row),
      receiptNumber,
      amountPerMangalya: MANGALYA_RATE,
      quantity,
      totalAmount: quantity * MANGALYA_RATE,
      qrStatus: operation.qrStatus || (operation.tokenHash ? 'ACTIVE' : 'NOT_GENERATED'),
      invitationPreparedAt: operation.invitationPreparedAt || null,
      invitationPreparedBy: operation.invitationPreparedBy || '',
      whatsappDestination: operation.whatsappDestination || '',
      arrivalStatus: operation.arrivalStatus || 'NOT_ARRIVED',
      arrivedAt: operation.arrivedAt || null,
      arrivedBy: operation.arrivedBy || '',
      honourStatus: operation.honourStatus || 'PENDING',
      honouredAt: operation.honouredAt || null,
      honouredBy: operation.honouredBy || '',
    };
  });
}

function mergeGeneralDonorOperations(rows, operationsMap) {
  return rows.map((row) => {
    if (!isGeneralPreviousDonor(row)) return row;
    const sourceId = generalDonorSourceId(row);
    const operation = sourceId ? operationsMap.get(`${donorEventYear(row)}:${sourceId}`) || {} : {};
    return {
      ...row,
      donorType: 'DONOR',
      generalDonorSourceId: sourceId,
      eventYear: donorEventYear(row),
      qrStatus: operation.qrStatus || (operation.tokenHash ? 'ACTIVE' : 'NOT_GENERATED'),
      previousDonorCampaignName: operation.campaignName || '',
      previousDonorCampaignStatus: operation.campaignStatus || 'Pending',
      previousDonorCampaignStatusAt: operation.campaignStatusAt || null,
      previousDonorCampaignStatusBy: operation.campaignStatusBy || '',
      previousDonorCampaignRemarks: operation.campaignRemarks || '',
    };
  });
}

async function nextMangalyaReceiptNumber(eventYear) {
  const rows = (await loadMangalyaDonors()).rows;
  const sheetNumbers = rows
    .filter((row) => donorEventYear(row) === eventYear)
    .map((row) => normalizeMangalyaReceiptNumber(row.receiptNumber))
    .filter(Boolean)
    .map((receipt) => Number(receipt.slice(1)));
  const operations = isMongoConfigured()
    ? await MangalyaDonorOperation.find({ eventYear, receiptNumberNormalized: /^M\d{3}$/ }).lean()
    : [];
  const operationNumbers = operations
    .map((operation) => normalizeMangalyaReceiptNumber(operation.receiptNumberNormalized || operation.receiptNumber))
    .filter(Boolean)
    .map((receipt) => Number(receipt.slice(1)));
  const highest = Math.max(0, ...sheetNumbers, ...operationNumbers);
  return `M${String(highest + 1).padStart(3, '0')}`;
}

async function assertMangalyaReceiptUnique({ eventYear, donorSourceId, receiptNumber }) {
  const normalized = normalizeMangalyaReceiptNumber(receiptNumber);
  if (!normalized) {
    const error = new Error('Receipt number must use M001 format.');
    error.statusCode = 400;
    throw error;
  }
  const rows = (await loadMangalyaDonors()).rows;
  const sheetConflict = rows.find((row) =>
    row.donorId !== donorSourceId &&
    donorEventYear(row) === eventYear &&
    normalizeMangalyaReceiptNumber(row.receiptNumber) === normalized,
  );
  if (sheetConflict) {
    const error = new Error(`Receipt number ${normalized} is already used.`);
    error.statusCode = 409;
    throw error;
  }
  if (isMongoConfigured()) {
    const operationConflict = await MangalyaDonorOperation.findOne({
      eventYear,
      donorSourceId: { $ne: donorSourceId },
      receiptNumberNormalized: normalized,
    }).lean();
    if (operationConflict) {
      const error = new Error(`Receipt number ${normalized} is already used.`);
      error.statusCode = 409;
      throw error;
    }
  }
  return normalized;
}

function publicMangalyaDonor(donor, operation = {}, user = null, includeTokenUrl = false, req = null) {
  const quantity = mangalyaDonorQuantity(donor);
  const isPrivileged = isTreasurerOrPst(user);
  const receiptNumber = normalizeMangalyaReceiptNumber(donor.receiptNumber) ||
    normalizeMangalyaReceiptNumber(operation.receiptNumber);
  return {
    id: donor.id,
    donorId: donor.donorId || '',
    identityReady: Boolean(donor.donorId),
    eventYear: donorEventYear(donor),
    donorType: 'MANGALYA',
    donorName: donor.donorName || donor.sponsorName || '',
    mobile: isPrivileged ? donor.contactNo || '' : maskForVolunteer(donor.contactNo),
    quantity,
    amountPerMangalya: MANGALYA_RATE,
    totalAmount: quantity * MANGALYA_RATE,
    receiptNumber,
    paymentStatus: donor.status || '',
    qrStatus: operation.qrStatus || (operation.tokenHash ? 'ACTIVE' : 'NOT_GENERATED'),
    invitationPreparedAt: operation.invitationPreparedAt || null,
    arrivalStatus: operation.arrivalStatus || 'NOT_ARRIVED',
    arrivedAt: operation.arrivedAt || null,
    arrivedBy: operation.arrivedBy || '',
    honourStatus: operation.honourStatus || 'PENDING',
    honouredAt: operation.honouredAt || null,
    honouredBy: operation.honouredBy || '',
    qrUrl: includeTokenUrl && operation.clearToken ? `${publicOrigin(req)}${MANGALYA_QR_PREFIX}${operation.clearToken}` : '',
  };
}

function mandaliContactId(slNo, role, index, mobile, name) {
  return crypto
    .createHash('sha256')
    .update([slNo, role, index, mobile, name].join('|'))
    .digest('hex')
    .slice(0, 16);
}

function validWhatsAppMobile(rawMobile) {
  const normalized = normalizeMobileForAuth(rawMobile);
  return /^91[6-9]\d{9}$/.test(normalized) ? normalized : '';
}

function maskMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

function splitRepresentativeContacts(details) {
  const text = String(details || '').replace(/\r?\n/g, ' ').trim();
  if (!text) return [];
  const mobilePattern = /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/g;
  const matches = [...text.matchAll(mobilePattern)];
  if (!matches.length) return [{
    name: text.replace(/\s+/g, ' ').trim(),
    originalNumber: '',
    mobile: '',
  }];

  const contacts = [];
  let cursor = 0;
  matches.forEach((match) => {
    const before = text.slice(cursor, match.index).replace(/[,:;|/]+/g, ' ').trim();
    const name = before || 'Representative';
    contacts.push({
      name: name.replace(/\s+/g, ' '),
      originalNumber: match[0],
      mobile: validWhatsAppMobile(match[0]),
    });
    cursor = match.index + match[0].length;
  });
  return contacts;
}

function normalizeMandaliCsvRows(values) {
  if (!values || values.length < 2) return [];
  const [headers = [], ...rows] = values;
  const headerMap = buildHeaderMap(headers);
  const contacts = [];

  const addContact = ({ sourceRow, role, name, mobile, index }) => {
    const contactName = String(name || '').trim();
    const originalNumber = String(mobile || '').trim();
    if (!contactName && !originalNumber) return;
    const normalizedMobile = validWhatsAppMobile(originalNumber);
    contacts.push({
      id: mandaliContactId(sourceRow.slNo, role, index, normalizedMobile || originalNumber, contactName),
      slNo: sourceRow.slNo,
      area: sourceRow.area,
      mandali: sourceRow.mandali,
      name: contactName || 'Manual Review',
      role,
      originalNumber,
      mobileNumber: normalizedMobile,
      maskedMobile: maskMobile(normalizedMobile || originalNumber),
      validWhatsApp: Boolean(normalizedMobile),
      active: true,
      notes: normalizedMobile ? '' : 'Missing / invalid WhatsApp mobile',
      sourceFile: 'bangalore-arya-vysya-mandali-final.csv',
    });
  };

  rows.forEach((row, rowIndex) => {
    const sourceRow = {
      slNo: getCell(row, headerMap, ['Sl. No.', 'Sl No']),
      area: getCell(row, headerMap, ['Area']),
      mandali: getCell(row, headerMap, ['Sangham Name', 'Mandali / Trust Name', 'Mandali', 'Trust Name']),
    };
    addContact({
      sourceRow,
      role: 'President',
      name: getCell(row, headerMap, ['President Name']),
      mobile: getCell(row, headerMap, ['President Contact No.', 'President Contact No']),
      index: `${rowIndex}-president`,
    });
    addContact({
      sourceRow,
      role: 'Secretary',
      name: getCell(row, headerMap, ['Secretary Name']),
      mobile: getCell(row, headerMap, ['Secretary Contact No.', 'Secretary Contact No']),
      index: `${rowIndex}-secretary`,
    });
    splitRepresentativeContacts(getCell(row, headerMap, ['Representatives Details', 'Representative Details'])).forEach((representative, representativeIndex) => {
      addContact({
        sourceRow,
        role: 'Representative',
        name: representative.name,
        mobile: representative.mobile || representative.originalNumber,
        index: `${rowIndex}-representative-${representativeIndex}`,
      });
    });
  });

  const mobileCounts = contacts.reduce((counts, contact) => {
    if (contact.mobileNumber) counts.set(contact.mobileNumber, (counts.get(contact.mobileNumber) || 0) + 1);
    return counts;
  }, new Map());

  return contacts.map((contact) => ({
    ...contact,
    duplicateMobile: Boolean(contact.mobileNumber && mobileCounts.get(contact.mobileNumber) > 1),
    notes: [
      contact.notes,
      contact.mobileNumber && mobileCounts.get(contact.mobileNumber) > 1 ? 'Duplicate WhatsApp number' : '',
    ].filter(Boolean).join('; '),
  }));
}

async function loadMandaliContacts() {
  if (!fs.existsSync(MANDALI_CONTACTS_CSV)) {
    return {
      rows: [],
      refreshedAt: new Date().toISOString(),
      source: 'not-configured',
      notice: 'Mandali contacts CSV is not available on this server.',
    };
  }

  const csv = await fs.promises.readFile(MANDALI_CONTACTS_CSV, 'utf8');
  return {
    rows: normalizeMandaliCsvRows(parseCsv(csv)),
    refreshedAt: new Date().toISOString(),
    source: 'private-csv',
    notice: null,
  };
}

async function loadRegistrations() {
  console.log('Reading latest registrations from Google Sheets...');
  let result;
  try {
    result = await loadFromGoogleApi();
  } catch (error) {
    result = await loadFromCsvFallback();
  }

  const refreshedAt = new Date().toISOString();
  cache = {
    rows: result.rows,
    refreshedAt,
    source: result.source,
    writeEnabled: result.writeEnabled,
    notice: result.notice || null,
    sheetRowsLoaded: result.sheetRowsLoaded ?? result.rows.length,
    appRowsLoaded: result.appRowsLoaded ?? result.rows.length,
    rowDifference: result.rowDifference ?? 0,
  };
  console.log('Google Sheet refreshed successfully.');
  console.log(`Rows loaded: ${cache.rows.length}`);
  console.log(`Timestamp of latest fetch: ${refreshedAt}`);
  console.log(`Rows in Google Sheet: ${cache.sheetRowsLoaded}`);
  console.log(`Rows loaded into app: ${cache.appRowsLoaded}`);
  console.log(`Difference: ${cache.rowDifference}`);

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
  const normalizedRows = normalizeDonorRows(response.data.values);
  const operations = await loadMangalyaOperationsForRows(normalizedRows);
  const generalOperations = await loadGeneralDonorOperationsForRows(normalizedRows);

  donorCache = {
    rows: mergeGeneralDonorOperations(mergeMangalyaOperations(normalizedRows, operations), generalOperations),
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
  if (
    field === 'treasurerVerified' ||
    field === 'kitIssued' ||
    field === 'welcomeSent' ||
    field === 'paymentSent' ||
    field === 'receiptGenerated' ||
    field === 'meetingAttendance' ||
    field === 'eventAttendance' ||
    field === 'madalakkiGiven' ||
    field === 'photoFrameGiven'
  ) return value ? 'Yes' : 'No';
  return String(value ?? '');
}

async function updateRegistration(registrationId, updates) {
  if (!hasGoogleConfig()) {
    const error = new Error('Read-only mode. Google Sheets credentials are not configured.');
    error.statusCode = 403;
    throw error;
  }

  await loadFromGoogleApi().then((result) => {
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

  const sanitizedUpdates = { ...(updates || {}) };
  if (Object.prototype.hasOwnProperty.call(sanitizedUpdates, 'seatNo')) {
    const nextSeatRaw = String(sanitizedUpdates.seatNo || '').trim();
    if (nextSeatRaw) {
      const parsedSeat = parseSeatValue(nextSeatRaw);
      if (!parsedSeat) {
        const error = new Error(`Invalid seat format. Suggested next available seat: ${nextAvailableSeat(cache.rows, currentRow.eventType)}`);
        error.statusCode = 409;
        throw error;
      }
      const conflict = cache.rows.find((row) =>
        row.id !== currentRow.id &&
        row.eventType === currentRow.eventType &&
        parseSeatValue(row.seatNo)?.normalized === parsedSeat.normalized,
      );
      if (conflict) {
        const error = new Error(`Seat ${parsedSeat.normalized} is already allotted. Suggested next available seat: ${nextAvailableSeat(cache.rows, currentRow.eventType)}`);
        error.statusCode = 409;
        throw error;
      }
      sanitizedUpdates.seatNo = parsedSeat.normalized;
    }
  }

  if (Object.prototype.hasOwnProperty.call(sanitizedUpdates, 'receiptNo')) {
    const nextReceiptRaw = String(sanitizedUpdates.receiptNo || '').trim();
    if (nextReceiptRaw) {
      const parsedReceipt = receiptNumericValue(nextReceiptRaw, currentRow.eventType);
      if (parsedReceipt === null) {
        const error = new Error(`Invalid event-wise receipt number. Suggested next available receipt no: ${nextAvailableReceiptNo(cache.rows, currentRow.eventType)}`);
        error.statusCode = 409;
        throw error;
      }
      const existingReceipt = receiptNumericValue(currentRow.receiptNo, currentRow.eventType);
      if (existingReceipt && parsedReceipt !== existingReceipt) {
        const error = new Error(`Existing Receipt No. ${formatReceiptNo(currentRow.eventType, existingReceipt)} is already saved. Use the authorised receipt edit workflow to change it.`);
        error.statusCode = 409;
        throw error;
      }
      const expectedReceipt = suggestedReceiptNoForRow(cache.rows, currentRow);
      if (!existingReceipt && formatReceiptNo(currentRow.eventType, parsedReceipt) !== expectedReceipt) {
        const error = new Error(`Receipt No. must follow timestamp order. Suggested next available receipt no: ${expectedReceipt}`);
        error.statusCode = 409;
        throw error;
      }
      const conflict = cache.rows.find((row) =>
        row.id !== currentRow.id &&
        row.eventType === currentRow.eventType &&
        receiptNumericValue(row.receiptNo, currentRow.eventType) === parsedReceipt,
      );
      if (conflict) {
        const error = new Error(`Receipt No. ${nextReceiptRaw} is already used. Suggested next available receipt no: ${nextAvailableReceiptNo(cache.rows, currentRow.eventType)}`);
        error.statusCode = 409;
        throw error;
      }
      sanitizedUpdates.receiptNo = formatReceiptNo(currentRow.eventType, parsedReceipt);
    }
  }

  const data = Object.entries(sanitizedUpdates)
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

async function scanDistributionToken({ token, operationKey, actorUser }) {
  const actor = actorUser?.name || actorUser?.mobile;
  if (!actor || !String(actor).trim()) {
    const error = new Error('Unauthenticated scan blocked. Operator name is required.');
    error.statusCode = 401;
    throw error;
  }

  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  if (!operation) {
    const error = new Error('Invalid distribution operation.');
    error.statusCode = 400;
    throw error;
  }

  if (!hasGoogleConfig()) {
    const error = new Error('Read-only mode. Google Sheets credentials are not configured.');
    error.statusCode = 403;
    throw error;
  }

  await loadFromGoogleApi().then((result) => {
    const refreshedAt = new Date().toISOString();
    cache = {
      rows: result.rows,
      refreshedAt,
      source: result.source,
      writeEnabled: result.writeEnabled,
      sheetRowsLoaded: result.sheetRowsLoaded ?? result.rows.length,
      appRowsLoaded: result.appRowsLoaded ?? result.rows.length,
      rowDifference: result.rowDifference ?? 0,
    };
  });

  const mangalyaMatch = await resolveMangalyaToken(token, actorUser);
  if (mangalyaMatch) {
    return {
      status: 'mangalya-donor',
      recordType: 'MANGALYA',
      donor: mangalyaMatch.publicDonor,
      rows: cache.rows,
    };
  }

  const parsedQr = parseFixedReceiptQr(token);
  if (!parsedQr?.validation?.ok) {
    const error = new Error(parsedQr?.validation?.reason || 'Invalid QR. Participant not found.');
    error.statusCode = 404;
    throw error;
  }
  const matchingRows = cache.rows.filter((row) => (
    row.eventType === parsedQr.eventType &&
    receiptNumericValue(row.receiptNo, row.eventType) === parsedQr.receiptNumber &&
    parseFixedSeatNumber(row.seatNo)?.normalized === parsedQr.seatNo
  ));
  if (matchingRows.length !== 1) {
    const error = new Error('Invalid QR. Participant not found.');
    error.statusCode = matchingRows.length > 1 ? 409 : 404;
    throw error;
  }
  const currentRow = matchingRows[0];
  await recordQrToken(currentRow);

  const source = sourceForEvent(currentRow.eventType);
  if (!source?.spreadsheetId) {
    const error = new Error('Registration source sheet is not configured for write-back.');
    error.statusCode = 403;
    throw error;
  }

  const requiredFields = [
    operation.statusField,
    operation.timeField,
    operation.byField,
    operation.remarkField,
  ].filter(Boolean);
  const missingColumns = requiredFields
    .filter((field) => currentRow.adminColumns?.[field] === null || currentRow.adminColumns?.[field] === undefined)
    .map((field) => ADMIN_FIELDS[field]?.[0] || field);
  if (missingColumns.length) {
    const error = new Error(`Distribution columns missing: ${missingColumns.join(', ')}`);
    error.statusCode = 409;
    error.missingColumns = missingColumns;
    throw error;
  }

  if (currentRow[operation.statusField]) {
    await recordDistributionLog({
      row: currentRow,
      operationKey,
      status: 'already-completed',
      operatorUser: actorUser,
    });
    return {
      status: 'already-completed',
      operation: operation.label,
      participant: publicRows([currentRow])[0],
      completedAt: operation.timeField ? currentRow[operation.timeField] : '',
      completedBy: operation.byField ? currentRow[operation.byField] : '',
      rows: cache.rows,
    };
  }

  const timestamp = indiaDateTime();
  const updates = {
    [operation.statusField]: true,
  };
  if (operation.timeField) updates[operation.timeField] = timestamp;
  if (operation.byField) updates[operation.byField] = String(actor).trim();
  if (operation.remarkField) {
    const existingRemarks = String(currentRow.remarks || '').trim();
    const auditRemark = `${operation.label}: ${timestamp} by ${String(actor).trim()}`;
    updates[operation.remarkField] = existingRemarks ? `${existingRemarks}\n${auditRemark}` : auditRemark;
  }

  const data = Object.entries(updates).map(([field, value]) => {
    const columnIndex = currentRow.adminColumns[field];
    return {
      range: `'${getSheetName()}'!${columnLetter(columnIndex)}${currentRow.rowNumber}`,
      values: [[normalizePatchValue(field, value)]],
    };
  });

  const sheets = createSheetsClient();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: source.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  const next = await loadRegistrations();
  const updatedRow = next.rows.find((row) => row.id === currentRow.id) || currentRow;
  await recordDistributionLog({
    row: updatedRow,
    operationKey,
    status: 'completed',
    operatorUser: actorUser,
  });
  return {
    status: 'completed',
    operation: operation.label,
    participant: publicRows([updatedRow])[0],
    completedAt: timestamp,
    completedBy: String(actor).trim(),
    rows: next.rows,
  };
}

function normalizeDonorPatchValue(field, value) {
  if (
    field === 'whatsAppSent' ||
    field === 'appealSent' ||
    field === 'confirmationSent' ||
    field === 'paymentMessageSent' ||
    field === 'postEventSent' ||
    field === 'treasurerVerified'
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

  await loadMangalyaDonors();

  let matches = donorCache.rows.filter((row) => donorMatchesPatchId(row, donorId));
  if (matches.length !== 1) throw donorIdentityError();
  let currentRow = matches[0];
  const donorSourceId = currentRow.donorId || generalDonorSourceId(currentRow);

  if (Object.prototype.hasOwnProperty.call(updates || {}, 'receiptNumber')) {
    await assertMangalyaReceiptUnique({
      eventYear: donorEventYear(currentRow),
      donorSourceId,
      receiptNumber: updates.receiptNumber,
    });
    matches = donorCache.rows.filter((row) => donorMatchesPatchId(row, donorId));
    if (matches.length !== 1) throw donorIdentityError();
    currentRow = matches[0];
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

  const verified = await loadMangalyaDonors();
  const verifiedMatches = verified.rows.filter((row) => donorMatchesPatchId(row, donorId));
  if (verifiedMatches.length !== 1) throw donorIdentityError();
  return verified;
}

async function findMangalyaDonorById(donorId) {
  const next = await loadMangalyaDonors();
  const matches = next.rows.filter((row) => row.donorId === donorId);
  if (matches.length > 1) throw donorIdentityError();
  const donor = matches[0];
  if (!donor) {
    const error = String(donorId || '').startsWith('missing-donor-id:')
      ? donorIdentityError()
      : new Error('Mangalya donor row not found. Refresh data and try again.');
    if (!error.statusCode) error.statusCode = 404;
    throw error;
  }
  return donor;
}

async function getMangalyaOperationForDonor(donor, { create = false } = {}) {
  if (!isMongoConfigured()) {
    const error = new Error('MongoDB is required for Mangalya donor QR operations.');
    error.statusCode = 503;
    throw error;
  }
  await connectMongo();
  const eventYear = donorEventYear(donor);
  if (!donor.donorId) throw donorIdentityError();
  const receiptNumber = donorSheetReceiptNumber(donor);
  const update = {};
  if (receiptNumber) {
    update.receiptNumber = receiptNumber;
    update.receiptNumberNormalized = receiptNumber;
  }
  if (!create) {
    const operation = await MangalyaDonorOperation.findOne({
      eventYear,
      donorSourceId: donor.donorId,
    }).lean();
    return operation;
  }
  const operation = await MangalyaDonorOperation.findOneAndUpdate(
    { eventYear, donorSourceId: donor.donorId },
    {
      $setOnInsert: {
        eventYear,
        donorSourceId: donor.donorId,
        qrStatus: 'NOT_GENERATED',
        arrivalStatus: 'NOT_ARRIVED',
        honourStatus: 'PENDING',
      },
      ...(Object.keys(update).length ? { $set: update } : {}),
    },
    { new: true, upsert: true },
  ).lean();
  return operation;
}

async function generateOrResolveMangalyaQr({ donorId, user, regenerate = false, req }) {
  const donor = await findMangalyaDonorById(donorId);
  const quantity = mangalyaDonorQuantity(donor);
  if (!quantity) {
    const error = new Error('Number of Mangalyas must be at least 1 before QR generation.');
    error.statusCode = 400;
    throw error;
  }
  const eventYear = donorEventYear(donor);
  if (!donor.donorId) throw donorIdentityError();
  if (!donorPaymentVerified(donor)) {
    const error = new Error('QR generation is enabled only after Treasurer Verified / Payment Received.');
    error.statusCode = 403;
    throw error;
  }
  const sheetReceipt = donorSheetReceiptNumber(donor);
  const finalReceipt = sheetReceipt;
  if (!finalReceipt) {
    const error = new Error('Save the physical receipt number to Google Sheets before generating QR.');
    error.statusCode = 400;
    throw error;
  }

  await connectMongo();
  let operation = await MangalyaDonorOperation.findOne({ eventYear, donorSourceId: donor.donorId });
  const existingReceipt = normalizeMangalyaReceiptNumber(operation?.receiptNumber);
  if (existingReceipt && existingReceipt !== finalReceipt && !sheetReceipt) {
    const error = new Error(`Existing receipt number ${existingReceipt} is already preserved for this donor.`);
    error.statusCode = 409;
    throw error;
  }

  const clearToken = operation?.tokenRef && !regenerate ? operation.tokenRef : createMangalyaToken();
  const update = {
    receiptNumber: finalReceipt,
    receiptNumberNormalized: finalReceipt,
    qrStatus: 'ACTIVE',
  };
  if (clearToken) {
    update.tokenRef = clearToken;
    update.tokenHash = tokenHash(clearToken);
  }
  operation = await MangalyaDonorOperation.findOneAndUpdate(
    { eventYear, donorSourceId: donor.donorId },
    {
      $setOnInsert: {
        eventYear,
        donorSourceId: donor.donorId,
        arrivalStatus: 'NOT_ARRIVED',
        honourStatus: 'PENDING',
      },
      $set: update,
    },
    { new: true, upsert: true },
  ).lean();
  await recordMangalyaAudit({
    donorSourceId: donor.donorId,
    eventYear,
    eventType: regenerate ? 'MANGALYA_QR_REGENERATED' : 'MANGALYA_QR_GENERATED',
    user,
    remarks: `Receipt ${finalReceipt}`,
  });
  return {
    donor: publicMangalyaDonor(donor, { ...operation, clearToken }, user, true, req),
    token: clearToken,
  };
}

async function findGeneralDonorById(donorId) {
  await loadMangalyaDonors();
  const matches = donorCache.rows.filter((row) =>
    isGeneralPreviousDonor(row) &&
    (row.donorId === donorId || row.id === donorId || generalDonorSourceId(row) === donorId)
  );
  if (matches.length !== 1) throw donorIdentityError();
  return matches[0];
}

async function generateOrResolveGeneralDonorQr({ donorId, user, regenerate = false, req }) {
  if (!isMongoConfigured()) {
    const error = new Error('MongoDB is required for donor QR operations.');
    error.statusCode = 503;
    throw error;
  }
  const donor = await findGeneralDonorById(donorId);
  const donorSourceId = generalDonorSourceId(donor);
  if (!donorSourceId) throw donorIdentityError();
  if (!donorPaymentVerified(donor)) {
    const error = new Error('QR generation is enabled only after Treasurer Verified / Payment Received.');
    error.statusCode = 403;
    throw error;
  }

  await connectMongo();
  const eventYear = donorEventYear(donor);
  const operation = await GeneralDonorOperation.findOne({ eventYear, donorSourceId });
  const clearToken = operation?.tokenRef && !regenerate ? operation.tokenRef : createMangalyaToken();
  const update = {
    qrStatus: 'ACTIVE',
    tokenRef: clearToken,
    tokenHash: tokenHash(clearToken),
  };
  const next = await GeneralDonorOperation.findOneAndUpdate(
    { eventYear, donorSourceId },
    {
      $setOnInsert: { eventYear, donorSourceId },
      $set: update,
    },
    { new: true, upsert: true },
  ).lean();
  await recordGeneralDonorAudit({
    donorSourceId,
    eventYear,
    eventType: regenerate ? 'GENERAL_DONOR_QR_REGENERATED' : 'GENERAL_DONOR_QR_GENERATED',
    user,
  });
  return {
    donor: {
      id: donor.id,
      donorId: donor.donorId,
      generalDonorSourceId: donorSourceId,
      donorType: 'DONOR',
      qrStatus: next.qrStatus,
      qrUrl: `${publicOrigin(req)}/qr/donor/${clearToken}`,
    },
    token: clearToken,
  };
}

async function updateGeneralDonorCampaignStatus({ donorId, status, campaignName, remarks = '', user, whatsappDestination = '' }) {
  if (!isMongoConfigured()) {
    const error = new Error('MongoDB is required for donor campaign history.');
    error.statusCode = 503;
    throw error;
  }
  const allowedStatuses = new Set(['Pending', 'Sent', 'Skipped', 'Failed']);
  if (!allowedStatuses.has(status)) {
    const error = new Error('Invalid donor campaign status.');
    error.statusCode = 400;
    throw error;
  }
  const donor = await findGeneralDonorById(donorId);
  const donorSourceId = generalDonorSourceId(donor);
  if (!donorSourceId) throw donorIdentityError();
  await connectMongo();
  const eventYear = donorEventYear(donor);
  const next = await GeneralDonorOperation.findOneAndUpdate(
    { eventYear, donorSourceId },
    {
      $setOnInsert: { eventYear, donorSourceId },
      $set: {
        campaignName: String(campaignName || 'Previous Donors Campaign 2026').trim(),
        campaignStatus: status,
        campaignStatusAt: new Date(),
        campaignStatusBy: actorName(user),
        campaignRemarks: String(remarks || '').trim(),
        whatsappDestination: maskMobile(whatsappDestination || donor.contactNo || ''),
      },
    },
    { new: true, upsert: true },
  ).lean();
  await recordGeneralDonorAudit({
    donorSourceId,
    eventYear,
    eventType: 'GENERAL_DONOR_CAMPAIGN_STATUS',
    user,
    remarks: `${status}: ${remarks || ''}`.trim(),
  });
  return { donor, operation: next };
}

async function resolveMangalyaToken(rawToken, user = null) {
  if (!isMongoConfigured()) return null;
  const token = String(rawToken || '').trim();
  const markerIndex = token.indexOf(MANGALYA_QR_PREFIX);
  const tokenValue = markerIndex >= 0 ? token.slice(markerIndex + MANGALYA_QR_PREFIX.length).split(/[?#]/)[0] : token;
  if (!tokenValue || tokenValue.includes('|')) return null;
  await connectMongo();
  const operation = await MangalyaDonorOperation.findOne({ tokenHash: tokenHash(tokenValue) }).lean();
  if (!operation) return null;
  if (operation.qrStatus === 'REVOKED') {
    const error = new Error('Mangalya donor QR is revoked.');
    error.statusCode = 410;
    throw error;
  }
  const donor = await findMangalyaDonorById(operation.donorSourceId);
  return { donor, operation, publicDonor: publicMangalyaDonor(donor, operation, user) };
}

async function updateMangalyaArrivalOrHonour({ donorId, action, user }) {
  const donor = await findMangalyaDonorById(donorId);
  if (!donor.donorId) throw donorIdentityError();
  const operation = await getMangalyaOperationForDonor(donor, { create: true });
  const eventYear = donorEventYear(donor);
  const now = new Date();
  const actor = actorName(user);
  let next;

  if (action === 'arrive') {
    if (operation.arrivalStatus === 'ARRIVED') return { status: 'already-arrived', donor, operation };
    next = await MangalyaDonorOperation.findOneAndUpdate(
      { eventYear, donorSourceId: donor.donorId, arrivalStatus: { $ne: 'ARRIVED' } },
      { $set: { arrivalStatus: 'ARRIVED', arrivedAt: now, arrivedBy: actor } },
      { new: true },
    ).lean();
    if (next) await recordMangalyaAudit({ donorSourceId: donor.donorId, eventYear, eventType: 'MANGALYA_ARRIVED', user });
    return { status: next ? 'arrived' : 'already-arrived', donor, operation: next || operation };
  }

  if (action === 'honour') {
    if (operation.honourStatus === 'HONOURED') return { status: 'already-honoured', donor, operation };
    next = await MangalyaDonorOperation.findOneAndUpdate(
      { eventYear, donorSourceId: donor.donorId, honourStatus: { $ne: 'HONOURED' } },
      { $set: { honourStatus: 'HONOURED', honouredAt: now, honouredBy: actor } },
      { new: true },
    ).lean();
    if (next) await recordMangalyaAudit({ donorSourceId: donor.donorId, eventYear, eventType: 'MANGALYA_HONOURED', user });
    return { status: next ? 'honoured' : 'already-honoured', donor, operation: next || operation };
  }

  if (action === 'undo-honour') {
    next = await MangalyaDonorOperation.findOneAndUpdate(
      { eventYear, donorSourceId: donor.donorId },
      { $set: { honourStatus: 'PENDING', honouredAt: null, honouredBy: '' } },
      { new: true },
    ).lean();
    await recordMangalyaAudit({ donorSourceId: donor.donorId, eventYear, eventType: 'MANGALYA_HONOUR_REVERSED', user });
    return { status: 'honour-reversed', donor, operation: next || operation };
  }

  const error = new Error('Invalid Mangalya donor action.');
  error.statusCode = 400;
  throw error;
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'MVST Events' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    await ensureBootstrapUser();
    const user = await authFromRequest(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    return res.json({ ok: true, user });
  } catch {
    return res.status(500).json({ ok: false, error: 'Authentication unavailable' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const mobile = normalizeMobileForAuth(req.body?.mobile);
    const pin = String(req.body?.pin || '');
    if (!mobile || !validatePassword(pin)) return res.status(401).json({ ok: false, error: 'Invalid mobile number or PIN' });

    await ensureBootstrapUser();
    const user = await findAuthUserByMobile(mobile);
    if (!user || user.active === false || !verifyPin(pin, user.passwordHash)) {
      return res.status(401).json({ ok: false, error: 'Invalid mobile number or PIN' });
    }

    await updateLastLogin(user.id, new Date());
    const { sessionId, duration } = await createSession(user);
    setSessionCookie(req, res, sessionId, duration);
    return res.json({ ok: true, user: sanitizeAuthUser({ ...user, lastLogin: new Date().toISOString() }), expiresInMs: duration });
  } catch {
    return res.status(500).json({ ok: false, error: 'Authentication unavailable' });
  }
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  if (!currentPassword) return res.status(400).json({ ok: false, error: 'Current password is required.' });
  if (!validatePassword(newPassword)) return res.status(400).json({ ok: false, error: 'New password must be at least 4 characters.' });
  if (newPassword !== confirmPassword) return res.status(400).json({ ok: false, error: 'New password and confirm password must match.' });
  try {
    await changeOwnPassword(req.user, currentPassword, newPassword);
    clearSessionCookie(res);
    return res.json({ ok: true, message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message || 'Unable to change password.' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const sessionId = parseCookies(req)[SESSION_COOKIE];
  if (sessionId && isMongoConfigured()) {
    await connectMongo();
    await Session.deleteOne({ tokenHash: tokenHash(sessionId) });
  } else if (sessionId) {
    sessions.delete(sessionId);
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.get('/api/users', requirePst, async (req, res) => {
  const users = (await ensureBootstrapUser()).map(sanitizeAuthUser);
  res.json({ ok: true, rows: users });
});

app.post('/api/users', requirePst, async (req, res) => {
  const { name, mobile: rawMobile, role: rawRole, pin, active = true } = req.body || {};
  const mobile = normalizeMobileForAuth(rawMobile);
  if (!name || !mobile || !validatePin(pin)) return res.status(400).json({ ok: false, error: 'Name, valid mobile and 4/6 digit PIN are required.' });
  try {
    const user = await createAuthUserRecord({ name, mobile, role: rawRole, pin });
    if (active === false) await updateAuthUserRecord(user.id, { active: false });
    const rows = (await listAuthUsers()).map(sanitizeAuthUser);
    return res.json({ ok: true, user: sanitizeAuthUser(user), rows });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message || 'Unable to create user.' });
  }
});

app.patch('/api/users/:id', requirePst, async (req, res) => {
  const updates = req.body || {};
  if (Object.prototype.hasOwnProperty.call(updates, 'pin')) {
    return res.status(400).json({ ok: false, error: 'Use Reset Password to update another user password.' });
  }
  const user = await updateAuthUserRecord(req.params.id, updates);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });
  const rows = (await listAuthUsers()).map(sanitizeAuthUser);
  return res.json({ ok: true, user: sanitizeAuthUser(user), rows });
});

app.post('/api/users/:id/reset-password', requirePst, async (req, res) => {
  const nextPassword = String(req.body?.newPassword || '');
  if (!validatePassword(nextPassword)) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 4 characters.' });
  }
  try {
    const user = await resetUserPassword(req.params.id, nextPassword, req.user);
    const rows = (await listAuthUsers()).map(sanitizeAuthUser);
    return res.json({ ok: true, user: sanitizeAuthUser(user), rows, message: 'Password reset. User must change it on next login.' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message || 'Unable to reset password.' });
  }
});

app.get('/api/registrations', requireAuth, async (req, res) => {
  try {
    if (!cache.refreshedAt) await loadRegistrations();
    res.json({
      ok: true,
      rows: publicRows(cache.rows, req.user),
      refreshedAt: cache.refreshedAt,
      source: cache.source,
      writeEnabled: cache.writeEnabled,
      sheetRowsLoaded: cache.sheetRowsLoaded,
      appRowsLoaded: cache.appRowsLoaded,
      rowDifference: cache.rowDifference,
      notice: cache.notice,
      mode: cache.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicRows(cache.rows, req.user),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      sheetRowsLoaded: cache.sheetRowsLoaded,
      appRowsLoaded: cache.appRowsLoaded,
      rowDifference: cache.rowDifference,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.post('/api/registrations/refresh', requireAuth, async (req, res) => {
  try {
    const next = await loadRegistrations();
    res.json({
      ok: true,
      rows: publicRows(next.rows, req.user),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      sheetRowsLoaded: next.sheetRowsLoaded,
      appRowsLoaded: next.appRowsLoaded,
      rowDifference: next.rowDifference,
      notice: next.notice,
      mode: next.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: publicRows(cache.rows, req.user),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      sheetRowsLoaded: cache.sheetRowsLoaded,
      appRowsLoaded: cache.appRowsLoaded,
      rowDifference: cache.rowDifference,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.get('/api/distribution/audit', requireAuth, async (req, res) => {
  try {
    if (!cache.refreshedAt) await loadRegistrations();
    const missingColumns = missingDistributionColumns(cache.rows);
    res.json({
      ok: true,
      missingColumns,
      reusedExistingColumns: ['Kit Issued', 'Remarks'],
      proposedNewColumns: [
        'Meeting Attendance',
        'Meeting Attendance Time',
        'Meeting Attendance By',
        'Event Attendance',
        'Event Attendance Time',
        'Event Attendance By',
        'Madalakki Given',
        'Madalakki Time',
        'Madalakki By',
        'Photo Frame Given',
        'Photo Frame Time',
        'Photo Frame By',
      ],
      operations: Object.fromEntries(
        Object.entries(DISTRIBUTION_OPERATIONS).map(([key, operation]) => [key, {
          label: operation.label,
          fields: [
            ADMIN_FIELDS[operation.statusField]?.[0],
            ADMIN_FIELDS[operation.timeField]?.[0],
            ADMIN_FIELDS[operation.byField]?.[0],
            ADMIN_FIELDS[operation.remarkField]?.[0],
          ].filter(Boolean),
        }]),
      ),
      rows: publicRows(cache.rows, req.user),
      refreshedAt: cache.refreshedAt,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/distribution/scan', requireAuth, async (req, res) => {
  try {
    const result = await scanDistributionToken({
      token: req.body?.token,
      operationKey: req.body?.operation,
      actorUser: req.user,
    });
    res.json({
      ok: true,
      status: result.status,
      recordType: result.recordType || 'PARTICIPANT',
      operation: result.operation,
      participant: result.participant,
      donor: result.donor,
      completedAt: result.completedAt,
      completedBy: result.completedBy,
      rows: publicRows(result.rows, req.user),
      refreshedAt: cache.refreshedAt,
      source: cache.source,
      writeEnabled: cache.writeEnabled,
      sheetRowsLoaded: cache.sheetRowsLoaded,
      appRowsLoaded: cache.appRowsLoaded,
      rowDifference: cache.rowDifference,
      mode: cache.writeEnabled ? 'read-write' : 'read-only',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message,
      missingColumns: error.missingColumns || [],
    });
  }
});

app.patch('/api/registrations/:id', requirePst, async (req, res) => {
  try {
    const next = await updateRegistration(req.params.id, req.body);
    res.json({
      ok: true,
      message: 'Saved to Google Sheet',
      rows: publicRows(next.rows, req.user),
      refreshedAt: next.refreshedAt,
      source: next.source,
      writeEnabled: next.writeEnabled,
      sheetRowsLoaded: next.sheetRowsLoaded,
      appRowsLoaded: next.appRowsLoaded,
      rowDifference: next.rowDifference,
      notice: next.notice,
      mode: 'read-write',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok: false,
      rows: publicRows(cache.rows, req.user),
      refreshedAt: cache.refreshedAt,
      writeEnabled: false,
      notice: cache.notice,
      mode: 'read-only',
      error: error.message,
    });
  }
});

app.get('/api/mandali-contacts', requirePst, async (req, res) => {
  try {
    const result = await loadMandaliContacts();
    res.json({
      ok: true,
      rows: result.rows,
      refreshedAt: result.refreshedAt,
      source: result.source,
      notice: result.notice,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message || 'Unable to load Mandali contacts' });
  }
});

app.get(['/api/mangalya-sponsorship', '/api/mangalya-donors'], requirePst, async (req, res) => {
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

app.post(['/api/mangalya-sponsorship/refresh', '/api/mangalya-donors/refresh'], requirePst, async (req, res) => {
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

app.post(['/api/mangalya-sponsorship/:id/qr', '/api/mangalya-donors/:id/qr'], requirePst, async (req, res) => {
  try {
    const result = await generateOrResolveMangalyaQr({
      donorId: req.params.id,
      user: req.user,
      regenerate: false,
      req,
    });
    res.json({ ok: true, message: 'Mangalya donor QR generated', donor: result.donor, token: result.token });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post(['/api/mangalya-sponsorship/:id/regenerate-qr', '/api/mangalya-donors/:id/regenerate-qr'], requirePst, async (req, res) => {
  try {
    const result = await generateOrResolveMangalyaQr({
      donorId: req.params.id,
      user: req.user,
      regenerate: true,
      req,
    });
    res.json({ ok: true, message: 'Mangalya donor QR regenerated', donor: result.donor, token: result.token });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post(['/api/mangalya-sponsorship/:id/revoke-qr', '/api/mangalya-donors/:id/revoke-qr'], requirePst, async (req, res) => {
  try {
    const donor = await findMangalyaDonorById(req.params.id);
    const operation = await getMangalyaOperationForDonor(donor, { create: true });
    const next = await MangalyaDonorOperation.findOneAndUpdate(
      { eventYear: donorEventYear(donor), donorSourceId: donor.donorId },
      { $set: { qrStatus: 'REVOKED' } },
      { new: true },
    ).lean();
    await recordMangalyaAudit({ donorSourceId: donor.donorId, eventYear: donorEventYear(donor), eventType: 'MANGALYA_QR_REVOKED', user: req.user });
    res.json({ ok: true, donor: publicMangalyaDonor(donor, next || operation, req.user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/previous-donors/:id/qr', requirePst, async (req, res) => {
  try {
    const result = await generateOrResolveGeneralDonorQr({
      donorId: req.params.id,
      user: req.user,
      regenerate: false,
      req,
    });
    res.json({ ok: true, message: 'Donor QR generated', donor: result.donor, token: result.token });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/previous-donors/:id/regenerate-qr', requirePst, async (req, res) => {
  try {
    const result = await generateOrResolveGeneralDonorQr({
      donorId: req.params.id,
      user: req.user,
      regenerate: true,
      req,
    });
    res.json({ ok: true, message: 'Donor QR regenerated', donor: result.donor, token: result.token });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/previous-donors/:id/campaign-status', requirePst, async (req, res) => {
  try {
    const result = await updateGeneralDonorCampaignStatus({
      donorId: req.params.id,
      status: req.body?.status,
      campaignName: req.body?.campaignName,
      remarks: req.body?.remarks,
      whatsappDestination: req.body?.whatsappDestination,
      user: req.user,
    });
    res.json({
      ok: true,
      donor: {
        id: result.donor.id,
        donorId: result.donor.donorId,
        donorType: 'DONOR',
        previousDonorCampaignName: result.operation.campaignName,
        previousDonorCampaignStatus: result.operation.campaignStatus,
        previousDonorCampaignStatusAt: result.operation.campaignStatusAt,
        previousDonorCampaignStatusBy: result.operation.campaignStatusBy,
        previousDonorCampaignRemarks: result.operation.campaignRemarks,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.get('/api/qr/mangalya/:token', requireAuth, async (req, res) => {
  try {
    const result = await resolveMangalyaToken(req.params.token, req.user);
    if (!result) return res.status(404).json({ ok: false, error: 'Mangalya donor QR not found.' });
    return res.json({ ok: true, recordType: 'MANGALYA', donor: result.publicDonor });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post(['/api/mangalya-sponsorship/:id/invitation-prepared', '/api/mangalya-donors/:id/invitation-prepared'], requirePst, async (req, res) => {
  try {
    const donor = await findMangalyaDonorById(req.params.id);
    const operation = await getMangalyaOperationForDonor(donor, { create: true });
    const next = await MangalyaDonorOperation.findOneAndUpdate(
      { eventYear: donorEventYear(donor), donorSourceId: donor.donorId },
      {
        $set: {
          invitationPreparedAt: new Date(),
          invitationPreparedBy: actorName(req.user),
          whatsappDestination: maskMobile(req.body?.whatsappDestination || donor.contactNo || ''),
        },
      },
      { new: true },
    ).lean();
    await recordMangalyaAudit({ donorSourceId: donor.donorId, eventYear: donorEventYear(donor), eventType: 'MANGALYA_INVITATION_PREPARED', user: req.user });
    res.json({ ok: true, donor: publicMangalyaDonor(donor, next || operation, req.user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post(['/api/mangalya-sponsorship/:id/arrive', '/api/mangalya-donors/:id/arrive'], requireAuth, async (req, res) => {
  try {
    const result = await updateMangalyaArrivalOrHonour({ donorId: req.params.id, action: 'arrive', user: req.user });
    res.json({ ok: true, status: result.status, donor: publicMangalyaDonor(result.donor, result.operation, req.user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post(['/api/mangalya-sponsorship/:id/honour', '/api/mangalya-donors/:id/honour'], requireAuth, async (req, res) => {
  try {
    const result = await updateMangalyaArrivalOrHonour({ donorId: req.params.id, action: 'honour', user: req.user });
    res.json({ ok: true, status: result.status, donor: publicMangalyaDonor(result.donor, result.operation, req.user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message || 'Could not save the honour status. The donor has NOT been marked as honoured. Please retry.' });
  }
});

app.post(['/api/mangalya-sponsorship/:id/undo-honour', '/api/mangalya-donors/:id/undo-honour'], requirePst, async (req, res) => {
  try {
    const result = await updateMangalyaArrivalOrHonour({ donorId: req.params.id, action: 'undo-honour', user: req.user });
    res.json({ ok: true, status: result.status, donor: publicMangalyaDonor(result.donor, result.operation, req.user) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.get(['/api/sponsorship-requirements', '/api/sponsorship/requirements'], requirePst, async (req, res) => {
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

app.post(['/api/sponsorship-requirements/refresh', '/api/sponsorship/requirements/refresh'], requirePst, async (req, res) => {
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

app.patch(['/api/mangalya-sponsorship/:id', '/api/mangalya-donors/:id'], requirePst, async (req, res) => {
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

app.get('/api/whatsapp-group-config', requirePst, async (req, res) => {
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

app.post('/api/whatsapp-groups', requirePst, async (req, res) => {
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
