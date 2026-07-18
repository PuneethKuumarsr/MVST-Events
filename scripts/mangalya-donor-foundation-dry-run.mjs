import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';
import { google } from 'googleapis';
import mongoose from 'mongoose';

import { MangalyaDonorOperation } from '../server/models/MangalyaDonorOperation.js';

dotenv.config();

const projectRoot = process.cwd();
const serviceAccountPath = path.join(projectRoot, 'service-account.json');
const configuredRange = process.env.MANGALYA_SPONSORSHIP_RANGE ||
  process.env.SPONSORSHIP_CONTRIBUTIONS_RANGE ||
  "'Sponsorship 2026'!A:AZ";
const range = String(configuredRange).replace(/A:J$/i, 'A:AZ');
const spreadsheetId = process.env.MANGALYA_SPONSORSHIP_SHEET_ID || process.env.MANGALYA_DONORS_SHEET_ID || '';
const applyMigration = process.argv.includes('--apply-live-migration') &&
  process.argv.includes('--i-understand-this-writes-google-sheet');

function readServiceAccountFile() {
  try {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function headerIndex(headers, name) {
  const normalized = normalizeKey(name);
  return headers.findIndex((header) => normalizeKey(header) === normalized);
}

function normalizeDonorId(value) {
  const match = String(value || '').trim().toUpperCase().match(/^MD26-(\d{4})$/);
  return match ? `MD26-${match[1]}` : '';
}

function normalizeReceipt(value) {
  return String(value || '').trim().toUpperCase();
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(values) {
  return values.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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

function rowHash(row) {
  return crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex').slice(0, 10);
}

function nextDonorId(existing, sequence) {
  let next = sequence;
  let candidate = `MD26-${String(next).padStart(4, '0')}`;
  while (existing.has(candidate)) {
    next += 1;
    candidate = `MD26-${String(next).padStart(4, '0')}`;
  }
  existing.add(candidate);
  return { candidate, nextSequence: next + 1 };
}

const fileCredentials = readServiceAccountFile();
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || fileCredentials?.client_email || '';
const key = process.env.GOOGLE_PRIVATE_KEY || fileCredentials?.private_key || '';

if (!email || !key || !spreadsheetId) {
  console.log(JSON.stringify({
    ok: false,
    error: 'Missing Google Sheets configuration for read-only dry run.',
    configured: {
      serviceAccountEmailPresent: Boolean(email),
      privateKeyPresent: Boolean(key),
      spreadsheetIdPresent: Boolean(spreadsheetId),
      range,
    },
  }, null, 2));
  process.exit(0);
}

const auth = new google.auth.JWT({
  email,
  key: key.replace(/\\n/g, '\n'),
  scopes: [applyMigration ? 'https://www.googleapis.com/auth/spreadsheets' : 'https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const [meta, valuesResponse] = await Promise.all([
  sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title,sheets.properties.title' }),
  sheets.spreadsheets.values.get({ spreadsheetId, range }),
]);

const values = valuesResponse.data.values || [];
const headers = values[0] || [];
const rows = values.slice(1).filter((row) => row.some((cell) => String(cell || '').trim()));
const donorIdIndex = headerIndex(headers, 'Donor ID');
const receiptIndex = headerIndex(headers, 'Receipt Number');
const existingIds = new Set();
const duplicateIds = new Map();
const receiptCounts = new Map();
const proposals = [];
const invalidExistingDonorIds = [];
let blankIds = 0;
let nextSequence = 1;

rows.forEach((row) => {
  const rawId = donorIdIndex >= 0 ? String(row[donorIdIndex] || '').trim() : '';
  const id = normalizeDonorId(rawId);
  if (rawId && !id) invalidExistingDonorIds.push(rawId);
  if (id) {
    duplicateIds.set(id, (duplicateIds.get(id) || 0) + 1);
    existingIds.add(id);
    const numeric = Number(id.slice(-4));
    if (numeric >= nextSequence) nextSequence = numeric + 1;
  }
});

rows.forEach((row, index) => {
  const rowNumber = index + 2;
  const rawId = donorIdIndex >= 0 ? String(row[donorIdIndex] || '').trim() : '';
  const id = normalizeDonorId(rawId);
  const receipt = receiptIndex >= 0 ? normalizeReceipt(row[receiptIndex]) : '';
  if (!rawId) {
    blankIds += 1;
    const next = nextDonorId(existingIds, nextSequence);
    nextSequence = next.nextSequence;
    proposals.push({ rowNumber, proposedDonorId: next.candidate, rowHash: rowHash(row) });
  }
  if (receipt) receiptCounts.set(receipt, (receiptCounts.get(receipt) || 0) + 1);
});

const mongoSummary = {
  configured: Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB),
  totalOperations: 0,
  rowNumberIdentityRecords: 0,
  stableDonorIdRecords: 0,
  duplicateDonorSourceIds: [],
  recordsWithReceiptNumber: 0,
  recordsWithTokenHash: 0,
  arrivedRecords: 0,
  honouredRecords: 0,
};

if (mongoSummary.configured) {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB,
    autoIndex: false,
    autoCreate: false,
  });
  const operations = await MangalyaDonorOperation.find({}).lean();
  mongoSummary.totalOperations = operations.length;
  mongoSummary.rowNumberIdentityRecords = operations.filter((operation) => /^mangalya:\d+$/.test(operation.donorSourceId || '')).length;
  mongoSummary.stableDonorIdRecords = operations.filter((operation) => /^MD26-\d{4}$/.test(operation.donorSourceId || '')).length;
  const sourceCounts = new Map();
  operations.forEach((operation) => {
    sourceCounts.set(operation.donorSourceId, (sourceCounts.get(operation.donorSourceId) || 0) + 1);
  });
  mongoSummary.duplicateDonorSourceIds = [...sourceCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([donorSourceId, count]) => ({ donorSourceId, count }));
  mongoSummary.recordsWithReceiptNumber = operations.filter((operation) => operation.receiptNumber || operation.receiptNumberNormalized).length;
  mongoSummary.recordsWithTokenHash = operations.filter((operation) => operation.tokenHash).length;
  mongoSummary.arrivedRecords = operations.filter((operation) => operation.arrivalStatus === 'ARRIVED').length;
  mongoSummary.honouredRecords = operations.filter((operation) => operation.honourStatus === 'HONOURED').length;
  await mongoose.disconnect();
}

const duplicateReceipts = [...receiptCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([receiptNumber, count]) => ({ receiptNumber, count }));

let migrationWriteResult = null;
if (applyMigration) {
  const duplicateDonorIds = [...duplicateIds.values()].some((count) => count > 1);
  const duplicateReceiptNumbers = duplicateReceipts.length > 0;
  if (invalidExistingDonorIds.length) {
    throw new Error('Invalid existing Donor ID values found. Migration stopped.');
  }
  if (duplicateDonorIds) {
    throw new Error('Duplicate Donor IDs already exist. Migration stopped.');
  }
  if (duplicateReceiptNumbers) {
    throw new Error('Duplicate Receipt Numbers already exist. Migration stopped.');
  }

  const backupDir = path.join(projectRoot, 'output', 'mangalya-migration-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `mangalya-sponsorship-2026-backup-${timestampForFile()}.csv`);
  fs.writeFileSync(backupPath, toCsv(values), 'utf8');

  if (donorIdIndex >= 0 && blankIds === 0 && receiptIndex >= 0) {
    migrationWriteResult = {
      backupPath,
      headersWritten: [],
      donorIdsWritten: 0,
      verification: 'No migration writes needed.',
    };
  } else {
    const sheetName = String(range).split('!')[0].replace(/^'|'$/g, '');
    const headerWrites = [];
    const appendStartIndex = headers.length;
    const donorIdTargetIndex = donorIdIndex >= 0 ? donorIdIndex : appendStartIndex;
    const receiptTargetIndex = receiptIndex >= 0
      ? receiptIndex
      : donorIdIndex >= 0
        ? appendStartIndex
        : appendStartIndex + 1;
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties(sheetId,title,gridProperties)',
    });
    const sheet = metadata.data.sheets?.find((item) => item.properties?.title === sheetName);
    const targetColumnCount = Math.max(
      sheet?.properties?.gridProperties?.columnCount || 0,
      donorIdTargetIndex + 1,
      receiptTargetIndex + 1,
    );
    if (sheet && (sheet.properties?.gridProperties?.columnCount || 0) < targetColumnCount) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: sheet.properties.sheetId,
                gridProperties: { columnCount: targetColumnCount },
              },
              fields: 'gridProperties.columnCount',
            },
          }],
        },
      });
    }
    if (donorIdIndex < 0) headerWrites.push({ range: `'${sheetName}'!${columnLetter(donorIdTargetIndex)}1`, values: [['Donor ID']] });
    if (receiptIndex < 0) headerWrites.push({ range: `'${sheetName}'!${columnLetter(receiptTargetIndex)}1`, values: [['Receipt Number']] });
    const donorIdColumn = donorIdIndex >= 0
      ? columnLetter(donorIdIndex)
      : columnLetter(donorIdTargetIndex);
    const idWrites = proposals.map((proposal) => ({
      range: `'${sheetName}'!${donorIdColumn}${proposal.rowNumber}`,
      values: [[proposal.proposedDonorId]],
    }));
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [...headerWrites, ...idWrites],
      },
    });
    const verifyResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const verifyValues = verifyResponse.data.values || [];
    const verifyHeaders = verifyValues[0] || [];
    const verifyRows = verifyValues.slice(1).filter((row) => row.some((cell) => String(cell || '').trim()));
    const verifyDonorIdIndex = headerIndex(verifyHeaders, 'Donor ID');
    const verifyReceiptIndex = headerIndex(verifyHeaders, 'Receipt Number');
    const verifyIds = verifyRows.map((row) => normalizeDonorId(row[verifyDonorIdIndex]));
    const verifyIdCounts = new Map();
    verifyIds.forEach((id) => verifyIdCounts.set(id, (verifyIdCounts.get(id) || 0) + 1));
    const verifyDuplicateIds = [...verifyIdCounts.entries()]
      .filter(([id, count]) => !id || count > 1)
      .map(([donorId, count]) => ({ donorId, count }));
    const verifyReceipts = verifyRows.map((row) => verifyReceiptIndex >= 0 ? String(row[verifyReceiptIndex] || '').trim() : '');
    const originalComparable = rows.map((row) => JSON.stringify(row.slice(0, 10)));
    const verifyComparable = verifyRows.map((row) => JSON.stringify(row.slice(0, 10)));
    const existingFieldsChanged = originalComparable.some((value, index) => value !== verifyComparable[index]);
    migrationWriteResult = {
      backupPath,
      headersWritten: headerWrites.map((item) => item.range),
      donorIdsWritten: idWrites.length,
      verification: {
        totalRows: verifyRows.length,
        nonblankDonorIds: verifyIds.filter(Boolean).length,
        duplicateDonorIds: verifyDuplicateIds,
        receiptNumbersAfterMigration: verifyReceipts.filter(Boolean).length,
        blankReceiptNumbersAfterMigration: verifyReceipts.filter((value) => !value).length,
        existingDonorFieldsChanged: existingFieldsChanged,
      },
    };
  }
}

console.log(JSON.stringify({
  ok: true,
  dryRunOnly: !applyMigration,
  noWritesPerformed: !applyMigration,
  migrationWriteResult,
  sheetTitle: meta.data.properties?.title || '',
  tabs: meta.data.sheets?.map((sheet) => sheet.properties?.title) || [],
  range,
  headers,
  currentDonorRows: rows.length,
  columnsPresent: {
    donorId: donorIdIndex >= 0,
    receiptNumber: receiptIndex >= 0,
  },
  rowsProcessed: rows.length,
  newDonorIdsAssigned: proposals.length,
  existingDonorIdsPreserved: rows.length - blankIds,
  existingReceiptNumbersPreserved: receiptIndex >= 0 ? rows.filter((row) => normalizeReceipt(row[receiptIndex])).length : 0,
  blankReceiptNumbersLeftBlank: receiptIndex >= 0 ? rows.filter((row) => !normalizeReceipt(row[receiptIndex])).length : rows.length,
  errors: invalidExistingDonorIds.length +
    [...duplicateIds.values()].filter((count) => count > 1).length +
    duplicateReceipts.length,
  invalidExistingDonorIds,
  columnsProposed: [
    donorIdIndex >= 0 ? null : 'Donor ID',
    receiptIndex >= 0 ? null : 'Receipt Number',
  ].filter(Boolean),
  blankDonorIds: blankIds,
  nonblankDonorIds: rows.length - blankIds,
  duplicateDonorIds: [...duplicateIds.entries()]
    .filter(([, count]) => count > 1)
    .map(([donorId, count]) => ({ donorId, count })),
  proposedIdRange: proposals.length
    ? `${proposals[0].proposedDonorId} through ${proposals[proposals.length - 1].proposedDonorId}`
    : 'none',
  proposedAssignments: proposals,
  blankReceiptNumbers: receiptIndex >= 0 ? rows.filter((row) => !normalizeReceipt(row[receiptIndex])).length : rows.length,
  receiptNumbersProposedAutomatically: 0,
  duplicateReceiptNumbers: duplicateReceipts,
  existingDonorFieldsToBeModified: 'none',
  mongoSummary,
}, null, 2));
