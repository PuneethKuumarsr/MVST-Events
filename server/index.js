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
  contactNo: ['Contact No'],
  whatsAppSent: ['WhatsApp Sent'],
  sentDate: ['Sent Date'],
};
const DONOR_RANGE = process.env.MANGALYA_DONORS_RANGE || "'Donors 2026'!A:H";

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

function numberFrom(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolFrom(value) {
  return ['yes', 'y', 'true', 'verified', 'issued', 'done', '1'].includes(
    String(value || '').trim().toLowerCase(),
  );
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
  return Boolean(hasGoogleCredentials() && process.env.MANGALYA_DONORS_SHEET_ID);
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
      const balance = Math.max(contribution - paidAmount, 0);
      const calculatedStatus =
        paidAmount >= contribution ? 'Full Paid' : paidAmount > 0 ? 'Part Paid' : 'Pending';
      const sheetPaymentStatus = getCell(row, headerMap, ['Payment Status']);

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
        paymentStatus: sheetPaymentStatus || calculatedStatus,
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
      return {
        id: `mangalya:${rowNumber}`,
        rowNumber,
        slNo: getCell(row, headerMap, ['Sl No', 'Sl. No.']),
        donorName: getCell(row, headerMap, ['Mangalya Donor']),
        contactNo: getCell(row, headerMap, ['Contact No']),
        quantitySponsored: numberFrom(getCell(row, headerMap, ['Quantity Sponsored'])),
        lastSponsoredYear: getCell(row, headerMap, ['Last Sponsored Year']),
        remarks: getCell(row, headerMap, ['Remarks']),
        whatsAppSent: boolFrom(getCell(row, headerMap, ['WhatsApp Sent'])),
        sentDate: getCell(row, headerMap, ['Sent Date']),
        adminColumns,
      };
    })
    .filter((row) => row.donorName || row.contactNo);
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
    spreadsheetId: process.env.MANGALYA_DONORS_SHEET_ID,
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
  if (field === 'whatsAppSent') return value ? 'Yes' : 'No';
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
    spreadsheetId: process.env.MANGALYA_DONORS_SHEET_ID,
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

app.get('/api/mangalya-donors', async (req, res) => {
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

app.post('/api/mangalya-donors/refresh', async (req, res) => {
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

app.patch('/api/mangalya-donors/:id', async (req, res) => {
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
