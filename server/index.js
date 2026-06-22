import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { google } from 'googleapis';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const DEFAULT_RANGE = 'Form Responses 1!A:Z';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

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
};

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

function numberFrom(value) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function boolFrom(value) {
  return ['yes', 'y', 'true', 'verified', 'issued', 'done', '1'].includes(
    String(value || '').trim().toLowerCase(),
  );
}

function normalizeRows(values, source) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  const headerMap = headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});

  return values
    .slice(1)
    .map((row) => {
      const paidAmount = numberFrom(getCell(row, headerMap, ['Paid Amount']));
      const contribution = source.contribution;
      const balance = Math.max(contribution - paidAmount, 0);
      const paymentStatus =
        paidAmount >= contribution ? 'Full Paid' : paidAmount > 0 ? 'Part Paid' : 'Pending';

      return {
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
        contribution,
        balance,
      };
    })
    .filter((row) => row.groomName || row.brideName || row.mobileNumber);
}

function parseSheetCsv(csv, source) {
  return normalizeRows(parseCsv(csv), source);
}

function requireConfig() {
  const missing = [];
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!process.env.GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY');
  if (!process.env.BHIMARATHA_SHEET_ID) missing.push('BHIMARATHA_SHEET_ID');
  if (!process.env.SHASHTIPOORTHI_SHEET_ID) missing.push('SHASHTIPOORTHI_SHEET_ID');
  if (missing.length) {
    throw new Error(`Missing Google Sheets configuration: ${missing.join(', ')}`);
  }
}

function createSheetsClient() {
  requireConfig();
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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

  return { rows: results.flat(), source: 'google-api' };
}

async function loadFromCsvFallback() {
  const results = await Promise.all(
    SHEETS.map(async (source) => {
      const response = await fetch(source.csvUrl);
      if (!response.ok) throw new Error(`CSV sheet ${source.id} returned ${response.status}`);
      return parseSheetCsv(await response.text(), source);
    }),
  );

  return { rows: results.flat(), source: 'public-csv' };
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
  };

  return cache;
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
    res.json({ ok: true, rows: cache.rows, refreshedAt: cache.refreshedAt, source: cache.source });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: cache.rows,
      refreshedAt: cache.refreshedAt,
      error: error.message,
    });
  }
});

app.post('/api/registrations/refresh', async (req, res) => {
  try {
    const next = await loadRegistrations();
    res.json({ ok: true, rows: next.rows, refreshedAt: next.refreshedAt, source: next.source });
  } catch (error) {
    res.status(500).json({
      ok: false,
      rows: cache.rows,
      refreshedAt: cache.refreshedAt,
      error: error.message,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`MVST Events server listening on http://localhost:${PORT}`);
});