import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  AlertTriangle,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Gift,
  HeartHandshake,
  Image,
  IndianRupee,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { buildWhatsAppMessage, normalizeWhatsAppMessage } from './whatsappMessages.js';
import bhimarathaReceiptTemplate from '../assets/receipts/bhimaratha-receipt.jpeg';
import shashtipoorthiReceiptTemplate from '../assets/receipts/shastipoorthi-receipt.jpeg';
import './styles.css';

const EVENT_DATE = 'Sunday, 02-Aug-2026';
const DEVELOPER_MODE = import.meta.env.VITE_DEVELOPER_MODE === 'true';
const RECEIPT_PREFIXES = { shashtipoorthi: 'SP26', bhimaratha: 'BS26' };
const RECEIPT_TEMPLATES = {
  shashtipoorthi: shashtipoorthiReceiptTemplate,
  bhimaratha: bhimarathaReceiptTemplate,
};

const EVENTS = {
  shashtipoorthi: {
    id: 'shashtipoorthi',
    label: 'Samoohika Shashtipoorthi Shanthi',
    shortLabel: 'Shashtipoorthi',
    contribution: 30000,
    includes: [
      'Saree',
      'Dhoti-Shalya',
      'Gold Mangalya Bottu',
      'Framed Couple Photo',
      'Madilakki / Odibhiyyam',
      '10 food coupons',
      'Breakfast and Lunch',
    ],
    rituals:
      'Gangapooja, Ghopooja, Kalasha Pooja, Homa, Harathi, Samprokshana with Silver Jaradi, Mangalya Dharane',
  },
  bhimaratha: {
    id: 'bhimaratha',
    label: 'Samoohika Bhimaratha Shanthi',
    shortLabel: 'Bhimaratha',
    contribution: 20000,
    includes: [
      'Saree',
      'Dhoti-Shalya',
      'Framed Couple Photo',
      'Madilakki / Odibhiyyam',
      '10 food coupons',
      'Breakfast and Lunch',
    ],
    rituals:
      'Gangapooja, Ghopooja, Kalasha Pooja, Homa, Harathi, Samprokshana with Silver Jaradi',
  },
};

const SHEETS = [
  {
    id: 'bhimaratha',
    sourceLabel: 'Bhimaratha Sheet',
    url: 'https://docs.google.com/spreadsheets/d/1lAiv6mWGXtVlxZ-4p1krjhc3bmau_Pgl1PKq0GylnJw/gviz/tq?tqx=out:csv&gid=1275850646',
  },
  {
    id: 'shashtipoorthi',
    sourceLabel: 'Shashtipoorthi Sheet',
    url: 'https://docs.google.com/spreadsheets/d/1PyxCC2HN7hCls-xR8Ao62xVZbM6w0OEa8Ri_OUu7XQo/gviz/tq?tqx=out:csv&gid=1773543601',
  },
];

const SAMPLE_ROWS = [
  {
    eventType: 'shashtipoorthi',
    sourceLabel: 'Shashtipoorthi Sheet',
    timestamp: '2026-05-12 10:30',
    groomName: 'M V Suresh Kumar',
    groomAge: '61',
    brideName: 'M Suma',
    brideAge: '57',
    address: 'Basavanagudi, Bengaluru',
    gothra: 'Kashyapa',
    mobileNumber: '9876543210',
    emailId: 'suresh@example.com',
    paidAmount: 30000,
    treasurerVerified: true,
    kitIssued: false,
    welcomeSent: false,
    welcomeSentDate: '',
    paymentSent: false,
    paymentSentDate: '',
    seatNo: '',
    receiptNo: '',
    receiptGenerated: false,
    remarks: 'Payment complete',
    couplePhoto: 'https://drive.google.com/',
    paymentScreenshot: 'https://drive.google.com/',
  },
  {
    eventType: 'shashtipoorthi',
    sourceLabel: 'Shashtipoorthi Sheet',
    timestamp: '2026-05-14 16:10',
    groomName: 'Ramesh Gupta',
    groomAge: '60',
    brideName: 'Latha Gupta',
    brideAge: '56',
    address: 'Jayanagar, Bengaluru',
    gothra: 'Vasishta',
    mobileNumber: '9876501234',
    emailId: 'ramesh@example.com',
    paidAmount: 12000,
    treasurerVerified: false,
    kitIssued: false,
    welcomeSent: false,
    welcomeSentDate: '',
    paymentSent: false,
    paymentSentDate: '',
    seatNo: '',
    receiptNo: '',
    receiptGenerated: false,
    remarks: 'Balance reminder needed',
    couplePhoto: '',
    paymentScreenshot: 'https://drive.google.com/',
  },
  {
    eventType: 'bhimaratha',
    sourceLabel: 'Bhimaratha Sheet',
    timestamp: '2026-05-18 09:40',
    groomName: 'Nagaraj Setty',
    groomAge: '70',
    brideName: 'Padma Setty',
    brideAge: '66',
    address: 'Mysuru',
    gothra: 'Bharadwaja',
    mobileNumber: '9876512345',
    emailId: 'nagaraj@example.com',
    paidAmount: 0,
    treasurerVerified: false,
    kitIssued: false,
    welcomeSent: false,
    welcomeSentDate: '',
    paymentSent: false,
    paymentSentDate: '',
    seatNo: '',
    receiptNo: '',
    receiptGenerated: false,
    remarks: 'Awaiting payment',
    couplePhoto: 'https://drive.google.com/',
    paymentScreenshot: '',
  },
];

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

function normalizeRow(row, headerMap, source) {
  const eventType = source.id;
  const paidAmount = numberFrom(getCell(row, headerMap, ['Paid Amount']));
  const contribution = EVENTS[eventType].contribution;
  const balance = Math.max(contribution - paidAmount, 0);
  const paymentStatus =
    paidAmount >= contribution ? 'Full Paid' : paidAmount > 0 ? 'Part Paid' : 'Pending';

  return {
    eventType,
    sourceLabel: source.sourceLabel,
    timestamp: getCell(row, headerMap, ['Timestamp']),
    groomName: getCell(row, headerMap, ['Groom Name']),
    groomAge: getCell(row, headerMap, ['Groom Age']),
    groomAadhaar: getCell(row, headerMap, ['Groom Aadhaar Card']),
    brideName: getCell(row, headerMap, ['Bride Name']),
    brideAge: getCell(row, headerMap, ['Bride Age']),
    brideAadhaar: getCell(row, headerMap, ['Bride Aadhaar Card']),
    address: getCell(row, headerMap, ['Address']),
    gothra: getCell(row, headerMap, ['Gothra']),
    couplePhoto: getCell(row, headerMap, ['Couple Photo']),
    mobileNumber: getCell(row, headerMap, ['Mobile Number', 'Phone']),
    emailId: getCell(row, headerMap, ['Email ID', 'Email']),
    paymentQr: getCell(row, headerMap, ['Scan this QR to Pay']),
    paymentScreenshot: getCell(row, headerMap, [
      'Upload Payment Screenshot',
      'Payment Screenshot',
    ]),
    paidAmount,
    paymentStatus,
    treasurerVerified: boolFrom(getCell(row, headerMap, ['Treasurer Verified'])),
    kitIssued: boolFrom(getCell(row, headerMap, ['KIT Issued', 'Kit Issued'])),
    welcomeSent: boolFrom(getCell(row, headerMap, ['Welcome Sent'])),
    welcomeSentDate: getCell(row, headerMap, ['Welcome Sent Date']),
    paymentSent: boolFrom(getCell(row, headerMap, ['Payment Sent'])),
    paymentSentDate: getCell(row, headerMap, ['Payment Sent Date']),
    seatNo: getCell(row, headerMap, ['Seat No']),
    receiptNo: getCell(row, headerMap, ['Receipt No']),
    receiptGenerated: boolFrom(getCell(row, headerMap, ['Receipt Generated'])),
    remarks: getCell(row, headerMap, ['Remarks']),
    contribution,
    balance,
  };
}

function parseSheetCsv(csv, source) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const headerMap = headers.reduce((map, header, index) => {
    map[normalizeKey(header)] = index;
    return map;
  }, {});

  return rows
    .slice(1)
    .map((row) => normalizeRow(row, headerMap, source))
    .filter((row) => row.groomName || row.brideName || row.mobileNumber);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function normalizeIndianMobileNumber(rawMobile) {
  const digits = String(rawMobile || '').replace(/\D/g, '');
  const normalizedDigits = digits.startsWith('0') ? digits.replace(/^0+/, '') : digits;
  if (normalizedDigits.length === 10) return `91${normalizedDigits}`;
  if (normalizedDigits.length === 12 && normalizedDigits.startsWith('91')) return normalizedDigits;
  return normalizedDigits;
}

function mobileDigits(rawMobile) {
  return String(rawMobile || '').replace(/\D/g, '');
}

function mobileValidationStatus(rawMobile) {
  const digits = mobileDigits(rawMobile);
  if (!digits) return { status: 'issue', issue: 'Missing Mobile', digits, normalized: '' };
  if (digits.length < 10) return { status: 'issue', issue: 'Invalid', digits, normalized: digits };
  if (digits.length === 10) return { status: 'ok', issue: 'OK', digits, normalized: '91' + digits };
  if (digits.length === 11 && digits.startsWith('0')) {
    return { status: 'ok', issue: 'OK after removing 0', digits, normalized: '91' + digits.slice(1) };
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return { status: 'ok', issue: 'OK', digits, normalized: digits };
  }
  return { status: 'issue', issue: 'Invalid', digits, normalized: digits };
}

function buildMobileValidationRows(rows) {
  const duplicateCounts = new Map();
  const baseRows = rows.map((participant) => {
    const validation = mobileValidationStatus(participant.mobileNumber);
    if (validation.normalized) {
      duplicateCounts.set(validation.normalized, (duplicateCounts.get(validation.normalized) || 0) + 1);
    }
    return { participant, validation };
  });

  return baseRows.map(({ participant, validation }) => {
    const duplicate = validation.normalized && duplicateCounts.get(validation.normalized) > 1;
    const issue = duplicate
      ? validation.status === 'ok'
        ? 'Duplicate mobile number'
        : validation.issue + ' + Duplicate mobile number'
      : validation.issue;
    return {
      eventType: eventDisplayName(participant.eventType),
      groomName: participant.groomName || '',
      brideName: participant.brideName || '',
      mobileNumber: participant.mobileNumber || '',
      issue,
      hasIssue: validation.status !== 'ok' || duplicate,
    };
  });
}

function csvEscape(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

function exportMobileIssues(rows) {
  const issueRows = rows.filter((row) => row.hasIssue);
  const header = ['Event Type', 'Groom Name', 'Bride Name', 'Mobile Number', 'Issue'];
  const csv = [
    header.map(csvEscape).join(','),
    ...issueRows.map((row) =>
      [row.eventType, row.groomName, row.brideName, row.mobileNumber, row.issue]
        .map(csvEscape)
        .join(','),
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mvst-mobile-issues.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function receiptPrefix(eventType) {
  return RECEIPT_PREFIXES[eventType] || 'RC26';
}

function receiptNumberValue(receiptNo, eventType) {
  const prefix = receiptPrefix(eventType);
  const pattern = '^' + prefix + '-(\\d+)$';
  const match = String(receiptNo || '').trim().match(new RegExp(pattern));
  return match ? Number(match[1]) : 0;
}

function nextReceiptNumber(rows, eventType) {
  const prefix = receiptPrefix(eventType);
  const maxNumber = rows
    .filter((row) => row.eventType === eventType)
    .reduce((max, row) => Math.max(max, receiptNumberValue(row.receiptNo, eventType)), 0);
  return prefix + '-' + String(maxNumber + 1).padStart(3, '0');
}

function receiptFileName(participant, receiptNo) {
  const cleanName = participantDisplayName(participant)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'participant';
  return receiptNo + '-' + cleanName + '.jpg';
}

function loadReceiptImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load receipt template'));
    image.src = src;
  });
}

function drawReceiptText(ctx, textValue, x, y, fontSize, align = 'left') {
  ctx.save();
  ctx.font = '700 ' + fontSize + 'px Arial, sans-serif';
  ctx.fillStyle = '#1f1714';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.72)';
  ctx.shadowBlur = 3;
  ctx.lineWidth = Math.max(2, Math.round(fontSize / 12));
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.strokeText(textValue, x, y);
  ctx.fillText(textValue, x, y);
  ctx.restore();
}

async function generateReceiptJpg(participant, receiptNo) {
  const template = RECEIPT_TEMPLATES[participant.eventType];
  if (!template) throw new Error('Receipt template is not configured for this event');
  const image = await loadReceiptImage(template);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const width = canvas.width;
  const height = canvas.height;
  const smallFont = Math.max(18, Math.round(width * 0.023));
  const nameFont = Math.max(22, Math.round(width * 0.029));
  drawReceiptText(ctx, 'Receipt No: ' + receiptNo, width * 0.68, height * 0.14, smallFont);
  drawReceiptText(ctx, 'Seat No: ' + (participant.seatNo || ''), width * 0.68, height * 0.2, smallFont);
  drawReceiptText(ctx, 'Couple Name: ' + participantDisplayName(participant), width * 0.5, height * 0.52, nameFont, 'center');

  return canvas.toDataURL('image/jpeg', 0.95);
}

function downloadReceipt(dataUrl, participant, receiptNo) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = receiptFileName(participant, receiptNo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function buildBulkReceiptRows(rows, eventType) {
  return rows.filter((row) =>
    row.eventType === eventType && String(row.seatNo || '').trim() && !row.receiptGenerated,
  );
}

function participantDisplayName(participant) {
  const groom = String(participant.groomName || '').trim() || 'Respected Sir';
  const bride = String(participant.brideName || '').trim();
  return bride ? groom + ' & ' + bride : groom;
}

function eventDisplayName(eventType) {
  return EVENTS[eventType]?.shortLabel || eventType || 'Event';
}

function paymentMessageType(participant) {
  if (participant.paymentStatus === 'Full Paid') return 'Full Payment';
  if (participant.paymentStatus === 'Part Paid') return 'Partial Payment';
  return null;
}

function buildBulkQueue(rows, queueType) {
  const sourceRows =
    queueType === 'welcome'
      ? rows
      : rows.filter((row) => ['Full Paid', 'Part Paid'].includes(row.paymentStatus));

  return sourceRows.map((participant) => {
    const messageType = queueType === 'welcome' ? 'Welcome' : paymentMessageType(participant);
    return {
      participant,
      messageKind: queueType === 'welcome' ? 'welcome' : 'confirmation',
      messageType,
      name: participantDisplayName(participant),
      mobileNumber: participant.mobileNumber || 'Missing',
      eventType: eventDisplayName(participant.eventType),
    };
  });
}
function makeWhatsAppMessage(participant, kind) {
  return buildWhatsAppMessage(participant, kind);
}

function makeWhatsAppUrl(participant, kind) {
  const normalizedMobile = normalizeIndianMobileNumber(participant.mobileNumber);
  const message = normalizeWhatsAppMessage(makeWhatsAppMessage(participant, kind));
  const encodedText = encodeURIComponent(message);
  const url = `https://wa.me/${normalizedMobile}?text=${encodedText}`;
  return url;
}

function debugWhatsAppMessage(participant, kind) {
  const url = makeWhatsAppUrl(participant, kind);
  const decodedMessage = decodeURIComponent(url.split('text=')[1] || '');
  console.debug('[MVST WhatsApp decoded message]', decodedMessage);
  return url;
}

function deliveryDateStamp() {
  return new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function donorBottuWord(quantitySponsored) {
  return Number(quantitySponsored) === 1 ? 'Bottu' : 'Bottus';
}

function buildMangalyaDonorAppealMessage(donor) {
  const quantitySponsored = Number(donor.quantitySponsored || 0) || 1;
  const bottuWord = donorBottuWord(quantitySponsored);
  return `🙏 Namaskara ${donor.donorName || 'Respected Donor'} Avare,

We hope you and your family are doing well by the grace of Vasavi Matha.

Last year, you generously sponsored ${quantitySponsored} Gold Mangalya ${bottuWord} for our Samoohika Shashtipoorthi Shanthi. We sincerely thank you for your valuable support.

This year, Mane Manege Vasavi Seva Trust (R) is once again organizing:

🪔 4th Samoohika Shashtipoorthi Shanthi
🪔 2nd Samoohika Bhimaratha Shanthi

📅 Date: Sunday, 02-Aug-2026
📍 Venue: Shubh Convention, JP Nagar, Bengaluru

💛 Mangalya Bottu Sponsorship: ₹15,000 per Bottu

With folded hands, we request your continued support by sponsoring Gold Mangalya Bottu(s) once again this year.

Your generosity will help us continue this noble tradition and bless many deserving senior couples.

Kindly reply to this message or contact us if you wish to continue your support.

🙏 Thank you for your continued trust and generosity.

Manemanege Vasavi Seva Trust (R) & Team`;
}

function makeMangalyaDonorWhatsAppUrl(donor) {
  const normalizedMobile = normalizeIndianMobileNumber(donor.contactNo);
  const message = buildMangalyaDonorAppealMessage(donor);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedMobile}?text=${encodedText}`;
}

function donorMobileIsValid(donor) {
  return mobileValidationStatus(donor.contactNo).status === 'ok';
}

function linkLabel(url) {
  return url ? 'Open' : 'Missing';
}

function withCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

function sourceText(source, writeEnabled) {
  if (source === 'google-api') return writeEnabled ? 'Google Sheets API' : 'Google Sheets';
  if (source === 'public-csv') return 'Google public CSV';
  return 'Google Sheets';
}

async function loadCsvFallback() {
  const results = await Promise.all(
    SHEETS.map(async (sheet) => {
      const response = await fetch(withCacheBust(sheet.url), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Public CSV sheet ${sheet.id} returned ${response.status}`);
      const text = await response.text();
      return parseSheetCsv(text, sheet);
    }),
  );
  return results.flat();
}

function formatRefreshTime(value) {
  if (!value) return 'Not refreshed yet';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function useParticipants() {
  const [rows, setRows] = useState(SAMPLE_ROWS);
  const [status, setStatus] = useState('Data Source: Google Sheets');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [writeEnabled, setWriteEnabled] = useState(false);

  async function loadFromBackend(forceRefresh = false) {
    const response = await fetch('/api/registrations' + (forceRefresh ? '/refresh' : ''), {
      method: forceRefresh ? 'POST' : 'GET',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Google Sheets API returned ${response.status}`);
    }
    return payload;
  }

  function applyPayload(payload) {
    const refreshedAt = payload.refreshedAt || new Date().toISOString();
    const nextSource = sourceText(payload.source, payload.writeEnabled);
    setRows(payload.rows || []);
    setLastRefreshedAt(refreshedAt);
    setDataSource(nextSource);
    setWriteEnabled(Boolean(payload.writeEnabled));
    setStatus(`Data Source: ${nextSource}. Last refreshed: ${formatRefreshTime(refreshedAt)}`);
    setError(payload.notice || '');
    setIsLive(true);
  }

  async function load(forceRefresh = false, aliveRef = { current: true }) {
    setIsRefreshing(true);
    setStatus('Refreshing Google Sheets data...');
    setRows([]);
    setError('');
    try {
      const payload = await loadFromBackend(forceRefresh);
      if (!aliveRef.current) return;
      applyPayload(payload);
    } catch (backendError) {
      try {
        const fallbackRows = await loadCsvFallback();
        if (!aliveRef.current) return;
        const fallbackRefreshedAt = new Date().toISOString();
        setRows(fallbackRows.length ? fallbackRows : SAMPLE_ROWS);
        setLastRefreshedAt(fallbackRefreshedAt);
        setDataSource('Google public CSV');
        setWriteEnabled(false);
        setStatus(`Data Source: Google public CSV. Last refreshed: ${formatRefreshTime(fallbackRefreshedAt)}`);
        setError('Google public CSV may take a few minutes to update. For instant updates, enable Google Sheets API service account.');
        setIsLive(false);
      } catch (fallbackError) {
        if (!aliveRef.current) return;
        setRows(SAMPLE_ROWS);
        setLastRefreshedAt(null);
        setDataSource('Sample data');
        setStatus('Data Source: Sample data');
        setWriteEnabled(false);
        setError(DEVELOPER_MODE ? `Google Sheets access failed: ${backendError.message}. CSV fallback failed: ${fallbackError.message}` : '');
        setIsLive(false);
      }
    } finally {
      if (aliveRef.current) setIsRefreshing(false);
    }
  }

  useEffect(() => {
    const aliveRef = { current: true };
    load(false, aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return {
    rows,
    status,
    error,
    isLive,
    isRefreshing,
    lastRefreshedAt,
    dataSource,
    writeEnabled,
    saveRegistration: async (id, updates) => {
      const response = await fetch(`/api/registrations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Google Sheets update returned ${response.status}`);
      }
      applyPayload(payload);
      setStatus(`${payload.message || 'Saved to Google Sheet'}. Data Source: ${sourceText(payload.source, payload.writeEnabled)}. Last refreshed: ${formatRefreshTime(payload.refreshedAt)}`);
      return payload;
    },
    refresh: () => load(true),
  };
}

function useMangalyaDonors() {
  const [donors, setDonors] = useState([]);
  const [status, setStatus] = useState('Loading Mangalya donors...');
  const [error, setError] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [writeEnabled, setWriteEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function applyPayload(payload) {
    const refreshedAt = payload.refreshedAt || new Date().toISOString();
    setDonors(payload.rows || []);
    setLastRefreshedAt(refreshedAt);
    setWriteEnabled(Boolean(payload.writeEnabled));
    setStatus(`Private Google Sheet. Last refreshed: ${formatRefreshTime(refreshedAt)}`);
    setError(payload.notice || '');
  }

  async function load(forceRefresh = false, aliveRef = { current: true }) {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/mangalya-donors' + (forceRefresh ? '/refresh' : ''), {
        method: forceRefresh ? 'POST' : 'GET',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || `Mangalya donor API returned ${response.status}`);
      if (!aliveRef.current) return;
      applyPayload(payload);
    } catch (loadError) {
      if (!aliveRef.current) return;
      setError(loadError.message || 'Unable to load Mangalya donors');
      setWriteEnabled(false);
    } finally {
      if (aliveRef.current) setIsRefreshing(false);
    }
  }

  useEffect(() => {
    const aliveRef = { current: true };
    load(false, aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return {
    donors,
    status,
    error,
    lastRefreshedAt,
    writeEnabled,
    isRefreshing,
    refresh: () => load(true),
    saveDonor: async (id, updates) => {
      const response = await fetch(`/api/mangalya-donors/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Mangalya donor update returned ${response.status}`);
      }
      applyPayload(payload);
      return payload;
    },
  };
}

function StatCard({ icon: Icon, label, value, tone, onClick }) {
  const content = (
    <>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button className={'stat-card ' + (tone || '') + ' clickable'} type="button" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={'stat-card ' + (tone || '')}>{content}</article>;
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function StatusPill({ children, tone }) {
  return <span className={`pill ${tone || ''}`}>{children}</span>;
}

function AdminEditPanel({ participant, writeEnabled, onSave }) {
  const [form, setForm] = useState({
    paidAmount: String(participant.paidAmount || 0),
    paymentStatus: participant.paymentStatus || 'Pending',
    seatNo: participant.seatNo || '',
    treasurerVerified: Boolean(participant.treasurerVerified),
    kitIssued: Boolean(participant.kitIssued),
    remarks: participant.remarks || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      paidAmount: String(participant.paidAmount || 0),
      paymentStatus: participant.paymentStatus || 'Pending',
      seatNo: participant.seatNo || '',
      treasurerVerified: Boolean(participant.treasurerVerified),
      kitIssued: Boolean(participant.kitIssued),
      remarks: participant.remarks || '',
    });
    setMessage('');
  }, [participant]);

  async function handleSave() {
    if (!writeEnabled || !participant.id) return;
    setSaving(true);
    setMessage('');
    try {
      await onSave(participant.id, {
        paidAmount: form.paidAmount,
        paymentStatus: form.paymentStatus,
        seatNo: form.seatNo,
        treasurerVerified: form.treasurerVerified,
        kitIssued: form.kitIssued,
        remarks: form.remarks,
      });
      setMessage('Saved to Google Sheet');
    } catch (error) {
      setMessage(error.message || 'Unable to save');
    } finally {
      setSaving(false);
    }
  }

  if (!writeEnabled) {
    return <div className="readonly-panel">Read-only mode</div>;
  }

  return (
    <div className="admin-panel">
      <label>
        <span>Paid Amount</span>
        <input
          type="number"
          min="0"
          value={form.paidAmount}
          onChange={(event) => setForm({ ...form, paidAmount: event.target.value })}
        />
      </label>
      <label>
        <span>Payment Status</span>
        <select
          value={form.paymentStatus}
          onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}
        >
          <option>Full Paid</option>
          <option>Part Paid</option>
          <option>Pending</option>
        </select>
      </label>
      <label>
        <span>Seat No</span>
        <input
          value={form.seatNo}
          onChange={(event) => setForm({ ...form, seatNo: event.target.value })}
          placeholder="A-001"
        />
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.treasurerVerified}
          onChange={(event) => setForm({ ...form, treasurerVerified: event.target.checked })}
        />
        Treasurer Verified
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={form.kitIssued}
          onChange={(event) => setForm({ ...form, kitIssued: event.target.checked })}
        />
        KIT Issued
      </label>
      <label className="remarks-field">
        <span>Remarks</span>
        <textarea
          value={form.remarks}
          onChange={(event) => setForm({ ...form, remarks: event.target.value })}
          rows="2"
        />
      </label>
      <button className="save-button" type="button" onClick={handleSave} disabled={saving}>
        <Save size={16} /> {saving ? 'Saving' : 'Save'}
      </button>
      {message ? <span className="save-message">{message}</span> : null}
    </div>
  );
}

function ReceiptPanel({ participant, rows, writeEnabled, onSave }) {
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [receiptNo, setReceiptNo] = useState(participant.receiptNo || '');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setReceiptNo(participant.receiptNo || '');
    setReceiptDataUrl('');
    setMessage('');
  }, [participant]);

  async function handleGenerateReceipt() {
    if (!writeEnabled || !participant.id) {
      setMessage('Read-only mode');
      return;
    }
    if (!String(participant.seatNo || '').trim()) {
      setMessage('Seat No is required before receipt generation');
      return;
    }
    setGenerating(true);
    setMessage('');
    const nextNo = participant.receiptNo || nextReceiptNumber(rows, participant.eventType);
    try {
      const dataUrl = await generateReceiptJpg(participant, nextNo);
      setReceiptDataUrl(dataUrl);
      setReceiptNo(nextNo);
      await onSave(participant.id, {
        receiptNo: nextNo,
        receiptGenerated: true,
      });
      setMessage('Receipt generated and saved to Google Sheet');
    } catch (error) {
      setMessage(error.message || 'Unable to generate receipt');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="receipt-panel">
      <div className="receipt-panel-head">
        <div>
          <span>Receipt Management</span>
          <strong>{participant.receiptNo || receiptNo || 'Receipt not generated'}</strong>
        </div>
        {participant.receiptGenerated ? <StatusPill tone="success">&#9989; Receipt Generated</StatusPill> : <StatusPill tone="neutral">Receipt Pending</StatusPill>}
      </div>
      <div className="receipt-meta-grid">
        <p><span>Seat No</span>{participant.seatNo || 'Not entered'}</p>
        <p><span>Receipt No</span>{participant.receiptNo || receiptNo || 'Not generated'}</p>
      </div>
      <div className="receipt-actions-row">
        <button type="button" onClick={handleGenerateReceipt} disabled={!writeEnabled || generating || !String(participant.seatNo || '').trim()}>
          <FileText size={16} /> {generating ? 'Generating' : 'Generate Receipt'}
        </button>
        <button type="button" onClick={() => downloadReceipt(receiptDataUrl, participant, receiptNo || participant.receiptNo)} disabled={!receiptDataUrl}>
          <Download size={16} /> Download Receipt
        </button>
      </div>
      {message ? <small>{message}</small> : null}
      {!writeEnabled ? <small>Read-only mode</small> : null}
    </div>
  );
}

function ParticipantCard({ participant, rows, writeEnabled, onSave }) {
  const event = EVENTS[participant.eventType];
  const [openedMessageType, setOpenedMessageType] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [markingSent, setMarkingSent] = useState(false);
  const paymentTone =
    participant.paymentStatus === 'Full Paid'
      ? 'success'
      : participant.paymentStatus === 'Part Paid'
        ? 'warning'
        : 'danger';

  function handleWhatsAppOpen(kind) {
    setOpenedMessageType(kind === 'welcome' ? 'welcome' : kind === 'kit' ? 'kit' : 'payment');
    setSentMessage('');
    debugWhatsAppMessage(participant, kind);
  }

  async function markOpenedMessageAsSent() {
    if (!writeEnabled || !participant.id || !['welcome', 'payment'].includes(openedMessageType)) return;
    setMarkingSent(true);
    setSentMessage('');
    const sentDate = deliveryDateStamp();
    const updates =
      openedMessageType === 'welcome'
        ? { welcomeSent: true, welcomeSentDate: sentDate }
        : { paymentSent: true, paymentSentDate: sentDate };
    try {
      await onSave(participant.id, updates);
      setSentMessage('Saved to Google Sheet');
    } catch (error) {
      setSentMessage(error.message || 'Unable to save sent status');
    } finally {
      setMarkingSent(false);
    }
  }

  return (
    <article className="participant-card">
      <div className="participant-top">
        <div>
          <p className="event-label">{event.shortLabel}</p>
          <h3>{participant.groomName || 'Groom'} & {participant.brideName || 'Bride'}</h3>
          <span className="source-badge">Source: {participant.sourceLabel}</span>
          <p className="muted">{participant.mobileNumber || 'No mobile'} - {participant.gothra || 'Gothra not entered'}</p>
        </div>
        <StatusPill tone={paymentTone}>{participant.paymentStatus}</StatusPill>
      </div>

      <div className="money-grid">
        <span>
          <small>Contribution</small>
          <b>{formatCurrency(participant.contribution)}</b>
        </span>
        <span>
          <small>Paid</small>
          <b>{formatCurrency(participant.paidAmount)}</b>
        </span>
        <span>
          <small>Balance</small>
          <b>{formatCurrency(participant.balance)}</b>
        </span>
      </div>

      <div className="flag-row">
        <StatusPill tone={participant.welcomeSent ? 'success' : 'neutral'}>
          Welcome {participant.welcomeSent ? 'Sent' : 'Pending'}
        </StatusPill>
        <StatusPill tone={participant.paymentSent ? 'success' : 'neutral'}>
          Payment {participant.paymentSent ? 'Sent' : 'Pending'}
        </StatusPill>
        {participant.receiptGenerated ? <StatusPill tone="success">&#9989; Receipt Generated</StatusPill> : null}
        <StatusPill tone={participant.treasurerVerified ? 'success' : 'neutral'}>
          Treasurer {participant.treasurerVerified ? 'Verified' : 'Pending'}
        </StatusPill>
        <StatusPill tone={participant.kitIssued ? 'success' : 'neutral'}>
          KIT {participant.kitIssued ? 'Issued' : 'Pending'}
        </StatusPill>
      </div>

      <div className="detail-grid delivery-status-row">
        <p><span>Form Timestamp</span>{participant.timestamp || 'Not entered'}</p>
        <p><span>Welcome Sent Date</span>{participant.welcomeSentDate || 'Not marked'}</p>
        <p><span>Payment Sent Date</span>{participant.paymentSentDate || 'Not marked'}</p>
        <p><span>Seat No</span>{participant.seatNo || 'Not entered'}</p>
        <p><span>Receipt No</span>{participant.receiptNo || 'Not generated'}</p>
      </div>

      <div className="detail-grid">
        <p><span>Address</span>{participant.address || 'Not entered'}</p>
        <p><span>Remarks</span>{participant.remarks || 'No remarks'}</p>
      </div>

      <AdminEditPanel participant={participant} writeEnabled={writeEnabled} onSave={onSave} />

      <ReceiptPanel participant={participant} rows={rows} writeEnabled={writeEnabled} onSave={onSave} />

      <div className="links-row">
        <a className={!participant.paymentScreenshot ? 'disabled' : ''} href={participant.paymentScreenshot || undefined} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Payment {linkLabel(participant.paymentScreenshot)}
        </a>
        <a className={!participant.couplePhoto ? 'disabled' : ''} href={participant.couplePhoto || undefined} target="_blank" rel="noreferrer">
          <Image size={16} /> Photo {linkLabel(participant.couplePhoto)}
        </a>
      </div>

      <div className="whatsapp-grid">
        <a href={makeWhatsAppUrl(participant, 'welcome')} onClick={() => handleWhatsAppOpen('welcome')} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> Welcome
        </a>
        <a href={makeWhatsAppUrl(participant, 'confirmation')} onClick={() => handleWhatsAppOpen('confirmation')} target="_blank" rel="noreferrer">
          <BadgeCheck size={16} /> Payment
        </a>
        <a href={makeWhatsAppUrl(participant, 'balance')} onClick={() => handleWhatsAppOpen('balance')} target="_blank" rel="noreferrer">
          <IndianRupee size={16} /> Balance
        </a>
        <a href={makeWhatsAppUrl(participant, 'kit')} onClick={() => handleWhatsAppOpen('kit')} target="_blank" rel="noreferrer">
          <Gift size={16} /> KIT
        </a>
      </div>

      {openedMessageType && openedMessageType !== 'kit' ? (
        <div className="sent-action-panel">
          <span>{openedMessageType === 'welcome' ? 'Welcome message opened' : 'Payment message opened'}</span>
          <button type="button" onClick={markOpenedMessageAsSent} disabled={!writeEnabled || markingSent}>
            {markingSent ? 'Saving' : 'Mark as Sent'}
          </button>
          {sentMessage ? <small>{sentMessage}</small> : null}
          {!writeEnabled ? <small>Read-only mode</small> : null}
        </div>
      ) : null}
    </article>
  );
}

function MangalyaDonorCard({ donor, writeEnabled, onSave }) {
  const [mobileValue, setMobileValue] = useState(donor.contactNo || '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [opened, setOpened] = useState(false);
  const validation = mobileValidationStatus(donor.contactNo);
  const canOpenWhatsApp = validation.status === 'ok';

  useEffect(() => {
    setMobileValue(donor.contactNo || '');
    setMessage('');
    setOpened(false);
  }, [donor]);

  async function saveMobileNumber() {
    if (!writeEnabled || !donor.id) return;
    setSaving(true);
    setMessage('');
    try {
      await onSave(donor.id, { contactNo: mobileValue });
      setMessage('Mobile number saved to Google Sheet');
    } catch (error) {
      setMessage(error.message || 'Unable to save mobile number');
    } finally {
      setSaving(false);
    }
  }

  function openWhatsApp() {
    if (!canOpenWhatsApp) return;
    const url = makeMangalyaDonorWhatsAppUrl(donor);
    console.debug('[MVST Mangalya donor WhatsApp decoded message]', buildMangalyaDonorAppealMessage(donor));
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpened(true);
    setMessage('');
  }

  async function markAsSent() {
    if (!writeEnabled || !donor.id) return;
    if (!window.confirm('Mark this Mangalya donor WhatsApp appeal as sent?')) return;
    setSaving(true);
    setMessage('');
    try {
      await onSave(donor.id, { whatsAppSent: true, sentDate: deliveryDateStamp() });
      setMessage('Saved to Google Sheet');
    } catch (error) {
      setMessage(error.message || 'Unable to mark as sent');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="donor-card">
      <div className="participant-top">
        <div>
          <p className="event-label">Mangalya Donor</p>
          <h3>{donor.donorName || 'Unnamed donor'}</h3>
          <p className="muted">{donor.contactNo || 'Mobile number missing'}</p>
        </div>
        <StatusPill tone={donor.whatsAppSent ? 'success' : 'warning'}>
          WhatsApp {donor.whatsAppSent ? 'Sent' : 'Pending'}
        </StatusPill>
      </div>

      <div className="detail-grid donor-detail-grid">
        <p><span>Quantity Sponsored in 2025</span>{donor.quantitySponsored || 0}</p>
        <p><span>Remarks</span>{donor.remarks || 'No remarks'}</p>
        <p><span>Sent Date</span>{donor.sentDate || 'Not marked'}</p>
        <p><span>Mobile Check</span>{validation.issue}</p>
      </div>

      {!donor.contactNo ? (
        <div className="donor-mobile-edit">
          <label>
            <span>Add Mobile Number</span>
            <input
              value={mobileValue}
              onChange={(event) => setMobileValue(event.target.value)}
              placeholder="10 digit mobile number"
            />
          </label>
          <button type="button" onClick={saveMobileNumber} disabled={!writeEnabled || saving}>
            {saving ? 'Saving' : 'Save Number'}
          </button>
        </div>
      ) : null}

      <div className="donor-actions">
        <button type="button" onClick={() => setPreviewOpen(!previewOpen)}>
          Preview Message
        </button>
        <button type="button" onClick={openWhatsApp} disabled={!canOpenWhatsApp}>
          Open WhatsApp
        </button>
        <button type="button" onClick={markAsSent} disabled={!writeEnabled || saving}>
          Mark as Sent
        </button>
      </div>

      {previewOpen ? (
        <pre className="donor-message-preview">{buildMangalyaDonorAppealMessage(donor)}</pre>
      ) : null}
      {opened ? <small className="donor-note">WhatsApp opened. Please send manually, then mark as sent.</small> : null}
      {message ? <small className="donor-note">{message}</small> : null}
      {!writeEnabled ? <small className="donor-note">Read-only mode</small> : null}
    </article>
  );
}

function MangalyaDonorsSection({ donorState }) {
  const { donors, status, error, writeEnabled, isRefreshing, refresh, saveDonor } = donorState;
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkStarted, setBulkStarted] = useState(false);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [bulkMessage, setBulkMessage] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkOpened, setBulkOpened] = useState(false);

  const summary = useMemo(() => ({
    uniqueDonors: donors.length,
    totalBottus: donors.reduce((sum, donor) => sum + (Number(donor.quantitySponsored) || 0), 0),
    whatsAppSent: donors.filter((donor) => donor.whatsAppSent).length,
    whatsAppPending: donors.filter((donor) => !donor.whatsAppSent).length,
    missingMobile: donors.filter((donor) => !String(donor.contactNo || '').trim()).length,
  }), [donors]);

  const currentBulkDonor = bulkQueue[bulkIndex];
  const hasNextBulkDonor = bulkStarted && bulkIndex < bulkQueue.length - 1;

  function prepareBulkQueue() {
    setBulkQueue(donors.filter((donor) => donorMobileIsValid(donor) && !donor.whatsAppSent));
    setBulkStarted(false);
    setBulkIndex(0);
    setBulkMessage('');
    setBulkOpened(false);
  }

  function clearBulkQueue() {
    setBulkQueue([]);
    setBulkStarted(false);
    setBulkIndex(0);
    setBulkMessage('');
    setBulkOpened(false);
  }

  function openBulkDonor(index) {
    const donor = bulkQueue[index];
    if (!donor) return;
    setBulkMessage('');
    console.debug('[MVST Mangalya donor WhatsApp decoded message]', buildMangalyaDonorAppealMessage(donor));
    window.open(makeMangalyaDonorWhatsAppUrl(donor), '_blank', 'noopener,noreferrer');
    setBulkStarted(true);
    setBulkOpened(true);
  }

  function openCurrentBulkDonor() {
    if (!bulkQueue.length) return;
    openBulkDonor(bulkIndex);
  }

  function openNextBulkDonor() {
    const nextIndex = bulkIndex + 1;
    if (nextIndex >= bulkQueue.length) return;
    setBulkIndex(nextIndex);
    setBulkOpened(false);
    openBulkDonor(nextIndex);
  }

  async function markBulkDonorAsSent() {
    if (!writeEnabled || !currentBulkDonor?.id) return;
    if (!window.confirm('Mark this Mangalya donor WhatsApp appeal as sent?')) return;
    setSavingBulk(true);
    setBulkMessage('');
    try {
      await saveDonor(currentBulkDonor.id, { whatsAppSent: true, sentDate: deliveryDateStamp() });
      setBulkMessage('Saved to Google Sheet');
    } catch (saveError) {
      setBulkMessage(saveError.message || 'Unable to mark as sent');
    } finally {
      setSavingBulk(false);
    }
  }

  return (
    <section className="management-section mangalya-donors-section">
      <div className="section-heading">
        <div>
          <p>Mangalya Donors 2026</p>
          <h2>Gold Mangalya Bottu donor follow-up</h2>
        </div>
        <button className="refresh-button compact" type="button" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh Donors'}
        </button>
      </div>

      <div className="event-note">
        <b>{status}</b>
        <span>{writeEnabled ? 'Private Google Sheet connected' : 'Read-only mode'}</span>
      </div>
      {error ? <div className="donor-warning">{error}</div> : null}

      <div className="stats-grid donor-stats-grid">
        <StatCard icon={UsersRound} label="Total unique donors" value={summary.uniqueDonors} />
        <StatCard icon={Gift} label="Total Bottus sponsored in 2025" value={summary.totalBottus} />
        <StatCard icon={MessageCircle} label="WhatsApp Sent" value={summary.whatsAppSent} tone="success" />
        <StatCard icon={MessageCircle} label="WhatsApp Pending" value={summary.whatsAppPending} tone="warning" />
        <StatCard icon={AlertTriangle} label="Missing Mobile Numbers" value={summary.missingMobile} tone="danger" />
      </div>

      <div className="bulk-whatsapp-panel donor-bulk-panel">
        <div className="bulk-actions">
          <button type="button" onClick={prepareBulkQueue}>
            <MessageCircle size={16} /> Preview All WhatsApp Messages
          </button>
        </div>

        {bulkQueue.length || bulkStarted ? (
          <div className="bulk-preview">
            <div className="bulk-preview-head">
              <div>
                <p>Mangalya Donor WhatsApp Queue</p>
                <h3>Total count: {bulkQueue.length}</h3>
              </div>
              <button type="button" onClick={clearBulkQueue}>Close</button>
            </div>
            {bulkQueue.length ? (
              <>
                <div className="bulk-preview-list donor-bulk-list">
                  {bulkQueue.map((donor, index) => (
                    <button
                      className={index === bulkIndex ? 'active' : ''}
                      key={donor.id}
                      onClick={() => {
                        setBulkIndex(index);
                        setBulkOpened(false);
                        setBulkMessage('');
                      }}
                      type="button"
                    >
                      <strong>{donor.donorName || 'Unnamed donor'}</strong>
                      <span>{donor.contactNo}</span>
                      <span>{donor.quantitySponsored} {donorBottuWord(donor.quantitySponsored)}</span>
                      <span>{donor.whatsAppSent ? 'Already Sent' : 'Appeal'}</span>
                    </button>
                  ))}
                </div>
                {currentBulkDonor ? (
                  <div className="donor-current-preview">
                    <div>
                      <p>Current Message Preview</p>
                      <strong>{currentBulkDonor.donorName || 'Unnamed donor'} - {currentBulkDonor.contactNo}</strong>
                    </div>
                    <textarea readOnly rows="10" value={buildMangalyaDonorAppealMessage(currentBulkDonor)} />
                  </div>
                ) : null}
                <div className="bulk-queue-controls">
                  <span>
                    {bulkOpened ? 'Opened' : 'Ready'} {bulkIndex + 1} of {bulkQueue.length}: {currentBulkDonor?.donorName}
                  </span>
                  <button type="button" onClick={openCurrentBulkDonor}>
                    {bulkOpened ? 'Reopen WhatsApp' : 'Open WhatsApp'}
                  </button>
                  <button type="button" onClick={markBulkDonorAsSent} disabled={!writeEnabled || savingBulk || !bulkOpened}>
                    {savingBulk ? 'Saving' : 'Mark as Sent'}
                  </button>
                  <button type="button" onClick={openNextBulkDonor} disabled={!hasNextBulkDonor}>
                    Next WhatsApp
                  </button>
                  {bulkMessage ? <small>{bulkMessage}</small> : null}
                </div>
              </>
            ) : (
              <p className="bulk-empty">No eligible donors found. Missing mobile numbers and already-sent donors are skipped.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="participants-list donor-list">
        {donors.length ? (
          donors.map((donor) => (
            <MangalyaDonorCard
              key={donor.id}
              donor={donor}
              writeEnabled={writeEnabled}
              onSave={saveDonor}
            />
          ))
        ) : (
          <div className="empty-state">
            <Gift size={28} />
            <p>No Mangalya donors loaded yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SelectField({ icon: Icon, label, value, onChange, children }) {
  return (
    <label className="select-field">
      <span>{Icon ? <Icon size={15} /> : null}{label}</span>
      <div>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <ChevronDown size={16} />
      </div>
    </label>
  );
}

function App() {
  const { rows, status, error, isLive, isRefreshing, dataSource, writeEnabled, saveRegistration, refresh } = useParticipants();
  const donorState = useMangalyaDonors();
  const [activeEvent, setActiveEvent] = useState('shashtipoorthi');
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [verifiedFilter, setVerifiedFilter] = useState('All');
  const [kitFilter, setKitFilter] = useState('All');
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkQueueType, setBulkQueueType] = useState('');
  const [bulkQueueStarted, setBulkQueueStarted] = useState(false);
  const [bulkQueueIndex, setBulkQueueIndex] = useState(0);
  const [bulkSentMessage, setBulkSentMessage] = useState('');
  const [markingBulkSent, setMarkingBulkSent] = useState(false);
  const [bulkReceiptGenerating, setBulkReceiptGenerating] = useState(false);
  const [bulkReceiptMessage, setBulkReceiptMessage] = useState('');

  const summary = useMemo(() => {
    const expected = rows.reduce((sum, row) => sum + row.contribution, 0);
    const received = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    return {
      total: rows.length,
      shashtipoorthi: rows.filter((row) => row.eventType === 'shashtipoorthi').length,
      bhimaratha: rows.filter((row) => row.eventType === 'bhimaratha').length,
      fullPaid: rows.filter((row) => row.paymentStatus === 'Full Paid').length,
      partPaid: rows.filter((row) => row.paymentStatus === 'Part Paid').length,
      pending: rows.filter((row) => row.paymentStatus === 'Pending').length,
      verified: rows.filter((row) => row.treasurerVerified).length,
      newRegistrations: rows.filter((row) => !row.treasurerVerified).length,
      newShashtipoorthi: rows.filter((row) => row.eventType === 'shashtipoorthi' && !row.treasurerVerified).length,
      newBhimaratha: rows.filter((row) => row.eventType === 'bhimaratha' && !row.treasurerVerified).length,
      kitIssued: rows.filter((row) => row.kitIssued).length,
      welcomeSent: rows.filter((row) => row.welcomeSent).length,
      welcomePending: rows.filter((row) => !row.welcomeSent).length,
      paymentSent: rows.filter((row) => row.paymentSent).length,
      paymentPending: rows.filter((row) => !row.paymentSent).length,
      shashtipoorthiReceiptsGenerated: rows.filter((row) => row.eventType === 'shashtipoorthi' && row.receiptGenerated).length,
      shashtipoorthiReceiptsPending: rows.filter((row) => row.eventType === 'shashtipoorthi' && !row.receiptGenerated).length,
      bhimarathaReceiptsGenerated: rows.filter((row) => row.eventType === 'bhimaratha' && row.receiptGenerated).length,
      bhimarathaReceiptsPending: rows.filter((row) => row.eventType === 'bhimaratha' && !row.receiptGenerated).length,
      expected,
      received,
      balance: expected - received,
    };
  }, [rows]);

  const mobileValidationRows = useMemo(() => buildMobileValidationRows(rows), [rows]);
  const mobileIssueRows = useMemo(
    () => mobileValidationRows.filter((row) => row.hasIssue),
    [mobileValidationRows],
  );

  const newRegistrationRows = useMemo(
    () => rows.filter((row) => !row.treasurerVerified),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => row.eventType === activeEvent)
      .filter((row) => row.treasurerVerified)
      .filter((row) => {
        if (!search) return true;
        return [row.groomName, row.brideName, row.mobileNumber]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .filter((row) => paymentFilter === 'All' || row.paymentStatus === paymentFilter)
      .filter((row) =>
        verifiedFilter === 'All'
          ? true
          : row.treasurerVerified === (verifiedFilter === 'Verified'),
      )
      .filter((row) =>
        kitFilter === 'All' ? true : row.kitIssued === (kitFilter === 'Issued'),
      );
  }, [rows, activeEvent, query, paymentFilter, verifiedFilter, kitFilter]);

  const currentBulkItem = bulkQueue[bulkQueueIndex];
  const hasNextBulkItem = bulkQueueStarted && bulkQueueIndex < bulkQueue.length - 1;

  function prepareBulkQueue(queueType) {
    setBulkQueue(buildBulkQueue(rows, queueType));
    setBulkQueueType(queueType);
    setBulkQueueStarted(false);
    setBulkQueueIndex(0);
    setBulkSentMessage('');
  }

  function clearBulkQueue() {
    setBulkQueue([]);
    setBulkQueueType('');
    setBulkQueueStarted(false);
    setBulkQueueIndex(0);
    setBulkSentMessage('');
  }

  function openBulkItem(index) {
    const item = bulkQueue[index];
    if (!item) return;
    setBulkSentMessage('');
    const url = debugWhatsAppMessage(item.participant, item.messageKind);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function confirmBulkQueue() {
    if (!bulkQueue.length) return;
    setBulkQueueStarted(true);
    setBulkQueueIndex(0);
    openBulkItem(0);
  }

  function openNextBulkMessage() {
    const nextIndex = bulkQueueIndex + 1;
    if (nextIndex >= bulkQueue.length) return;
    setBulkQueueIndex(nextIndex);
    openBulkItem(nextIndex);
  }

  async function markCurrentBulkMessageAsSent() {
    if (!writeEnabled || !currentBulkItem?.participant?.id || !['welcome', 'payment'].includes(bulkQueueType)) return;
    setMarkingBulkSent(true);
    setBulkSentMessage('');
    const sentDate = deliveryDateStamp();
    const updates =
      bulkQueueType === 'welcome'
        ? { welcomeSent: true, welcomeSentDate: sentDate }
        : { paymentSent: true, paymentSentDate: sentDate };
    try {
      await saveRegistration(currentBulkItem.participant.id, updates);
      setBulkSentMessage('Saved to Google Sheet');
    } catch (error) {
      setBulkSentMessage(error.message || 'Unable to save sent status');
    } finally {
      setMarkingBulkSent(false);
    }
  }

  function goToNewRegistrations() {
    scrollToSection('new-registrations-dashboard');
  }

  function goToPaymentPending() {
    setPaymentFilter('Pending');
    setVerifiedFilter('All');
    setKitFilter('All');
    scrollToSection('participant-management-dashboard');
  }

  function goToParticipantManagement() {
    setPaymentFilter('All');
    setVerifiedFilter('All');
    setKitFilter('All');
    scrollToSection('participant-management-dashboard');
  }

  async function generateBulkReceipts() {
    if (!writeEnabled) {
      setBulkReceiptMessage('Read-only mode');
      return;
    }
    const eligibleRows = buildBulkReceiptRows(rows, activeEvent);
    if (!eligibleRows.length) {
      setBulkReceiptMessage('No eligible receipts found for this event');
      return;
    }
    setBulkReceiptGenerating(true);
    setBulkReceiptMessage('');
    let workingRows = rows;
    let generatedCount = 0;
    try {
      for (const participant of eligibleRows) {
        const currentParticipant = workingRows.find((row) => row.id === participant.id) || participant;
        const receiptNo = currentParticipant.receiptNo || nextReceiptNumber(workingRows, currentParticipant.eventType);
        const dataUrl = await generateReceiptJpg(currentParticipant, receiptNo);
        downloadReceipt(dataUrl, currentParticipant, receiptNo);
        const payload = await saveRegistration(currentParticipant.id, {
          receiptNo,
          receiptGenerated: true,
        });
        workingRows = payload.rows || workingRows.map((row) =>
          row.id === currentParticipant.id ? { ...row, receiptNo, receiptGenerated: true } : row,
        );
        generatedCount += 1;
      }
      setBulkReceiptMessage('Generated ' + generatedCount + ' receipt(s) and saved to Google Sheet');
    } catch (error) {
      setBulkReceiptMessage(error.message || 'Unable to generate bulk receipts');
    } finally {
      setBulkReceiptGenerating(false);
    }
  }

  return (
    <main>
      <section className="hero-band">
        <div className="hero-content">
          <div className="hero-title-row">
            <img className="mvst-logo" src="/MVST_Logo.jpg" alt="MVST Events logo" />
            <div>
              <div className="trust-mark">
                <Sparkles size={18} />
                Mane Manege Vasavi Seva Trust (R)
              </div>
              <h1>MVST Events Dashboard</h1>
            </div>
          </div>
          <p>Phase 1 dashboard for Samoohika Shanthi registrations, payments, verification, KIT issue, and WhatsApp follow-up.</p>
          <div className="hero-meta">
            <span><CalendarDays size={17} /> {EVENT_DATE}</span>
            <span className={isLive ? 'live' : ''}><ShieldCheck size={17} /> {dataSource || 'Google Sheets'} {' \u00b7 '} {writeEnabled ? 'Read + Write' : 'Read-only mode'}</span>
          </div>
        </div>
      </section>

      <section className="status-strip">
        <div className="status-main">
          <ClipboardList size={18} />
          <span>{status}</span>
        </div>
        <button className="refresh-button" type="button" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh Data'}
        </button>
      </section>

      {error ? (
        <section className="error-strip">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="summary-section">
        <div className="section-heading">
          <div>
            <p>Dashboard Summary</p>
            <h2>Registration and collection overview</h2>
          </div>
        </div>
        <div className="stats-grid">
          <StatCard icon={UsersRound} label="Total registrations" value={summary.total} />
          <StatCard icon={HeartHandshake} label="Shashtipoorthi" value={summary.shashtipoorthi} />
          <StatCard icon={HeartHandshake} label="Bhimaratha" value={summary.bhimaratha} />
          <StatCard icon={CheckCircle2} label="Full Paid" value={summary.fullPaid} tone="success" />
          <StatCard icon={CircleDollarSign} label="Part Paid" value={summary.partPaid} tone="warning" />
          <StatCard icon={IndianRupee} label="Pending" value={summary.pending} tone="danger" onClick={goToPaymentPending} />
          <StatCard icon={ShieldCheck} label="Treasurer Verified" value={summary.verified} onClick={goToParticipantManagement} />
          <StatCard icon={ClipboardList} label="New Registrations" value={summary.newRegistrations} tone="warning" onClick={goToNewRegistrations} />
          <StatCard icon={HeartHandshake} label="New Shashtipoorthi" value={summary.newShashtipoorthi} tone="warning" onClick={goToNewRegistrations} />
          <StatCard icon={HeartHandshake} label="New Bhimaratha" value={summary.newBhimaratha} tone="warning" onClick={goToNewRegistrations} />
          <StatCard icon={Gift} label="KIT Issued" value={summary.kitIssued} />
          <StatCard icon={MessageCircle} label="Welcome Sent" value={summary.welcomeSent} tone="success" />
          <StatCard icon={MessageCircle} label="Welcome Pending" value={summary.welcomePending} tone="warning" onClick={goToParticipantManagement} />
          <StatCard icon={BadgeCheck} label="Payment Sent" value={summary.paymentSent} tone="success" onClick={goToParticipantManagement} />
          <StatCard icon={BadgeCheck} label="Payment Pending" value={summary.paymentPending} tone="warning" onClick={goToPaymentPending} />
          <StatCard icon={FileText} label="Shashtipoorthi Receipts Generated" value={summary.shashtipoorthiReceiptsGenerated} tone="success" />
          <StatCard icon={FileText} label="Shashtipoorthi Receipts Pending" value={summary.shashtipoorthiReceiptsPending} tone="warning" onClick={goToParticipantManagement} />
          <StatCard icon={FileText} label="Bhimaratha Receipts Generated" value={summary.bhimarathaReceiptsGenerated} tone="success" onClick={goToParticipantManagement} />
          <StatCard icon={FileText} label="Bhimaratha Receipts Pending" value={summary.bhimarathaReceiptsPending} tone="warning" onClick={goToParticipantManagement} />
          <StatCard icon={IndianRupee} label="Expected collection" value={formatCurrency(summary.expected)} />
          <StatCard icon={IndianRupee} label="Received collection" value={formatCurrency(summary.received)} tone="success" />
          <StatCard icon={IndianRupee} label="Balance receivable" value={formatCurrency(summary.balance)} tone="warning" />
        </div>
      </section>

      <section className="mobile-issues-section">
        <div className="section-heading">
          <div>
            <p>WhatsApp Check / Mobile Issues</p>
            <h2>Mobile number validation report</h2>
          </div>
          <button className="export-button" type="button" onClick={() => exportMobileIssues(mobileValidationRows)}>
            Export Mobile Issues
          </button>
        </div>
        <div className="mobile-report-card">
          <div className="mobile-report-summary">
            <span>Total checked: {mobileValidationRows.length}</span>
            <span>Issues: {mobileIssueRows.length}</span>
          </div>
          <div className="mobile-report-table">
            <div className="mobile-report-row heading">
              <span>Event Type</span>
              <span>Groom Name</span>
              <span>Bride Name</span>
              <span>Mobile Number</span>
              <span>Issue</span>
            </div>
            {mobileIssueRows.length ? (
              mobileIssueRows.map((row, index) => (
                <div className="mobile-report-row" key={
                  row.eventType + '-' + row.mobileNumber + '-' + row.groomName + '-' + index
                }>
                  <span>{row.eventType}</span>
                  <span>{row.groomName || 'Not entered'}</span>
                  <span>{row.brideName || 'Not entered'}</span>
                  <span>{row.mobileNumber || 'Missing'}</span>
                  <span>{row.issue}</span>
                </div>
              ))
            ) : (
              <div className="mobile-report-empty">No mobile issues found.</div>
            )}
          </div>
        </div>
      </section>

      <MangalyaDonorsSection donorState={donorState} />

      <section className="management-section new-registrations-section" id="new-registrations-dashboard">
        <div className="section-heading">
          <div>
            <p>New Registrations</p>
            <h2>Awaiting treasurer payment confirmation</h2>
          </div>
        </div>

        <div className="event-note">
          <b>{newRegistrationRows.length} pending confirmation</b>
          <span>Verify payment using Treasurer Verified to move the couple into regular participant management.</span>
        </div>

        <div className="participants-list">
          {newRegistrationRows.length ? (
            newRegistrationRows.map((participant, index) => (
              <ParticipantCard
                key={'new-' + participant.eventType + '-' + participant.mobileNumber + '-' + participant.timestamp + '-' + index}
                participant={participant}
                rows={rows}
                writeEnabled={writeEnabled}
                onSave={saveRegistration}
              />
            ))
          ) : (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <p>No new registrations waiting for treasurer confirmation.</p>
            </div>
          )}
        </div>
      </section>

      <section className="management-section" id="participant-management-dashboard">
        <div className="section-heading">
          <div>
            <p>Participant Management</p>
            <h2>Verified registrations by event</h2>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Event tabs">
          {Object.values(EVENTS).map((event) => (
            <button
              key={event.id}
              className={activeEvent === event.id ? 'active' : ''}
              onClick={() => setActiveEvent(event.id)}
              type="button"
            >
              {event.shortLabel}
            </button>
          ))}
        </div>

        <div className="controls">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search groom, bride, mobile"
            />
          </label>
          <SelectField icon={Filter} label="Payment" value={paymentFilter} onChange={setPaymentFilter}>
            <option>All</option>
            <option>Full Paid</option>
            <option>Part Paid</option>
            <option>Pending</option>
          </SelectField>
          <SelectField label="Treasurer" value={verifiedFilter} onChange={setVerifiedFilter}>
            <option>All</option>
            <option>Verified</option>
            <option>Pending</option>
          </SelectField>
          <SelectField label="KIT" value={kitFilter} onChange={setKitFilter}>
            <option>All</option>
            <option>Issued</option>
            <option>Pending</option>
          </SelectField>
        </div>

        <div className="event-note">
          <b>{EVENTS[activeEvent].label}</b>
          <span>{formatCurrency(EVENTS[activeEvent].contribution)} per couple</span>
        </div>

        <div className="receipt-bulk-panel">
          <div>
            <p>Bulk Receipt Generation</p>
            <span>{eventDisplayName(activeEvent)} eligible: {buildBulkReceiptRows(rows, activeEvent).length}</span>
          </div>
          <button type="button" onClick={generateBulkReceipts} disabled={!writeEnabled || bulkReceiptGenerating}>
            <FileText size={16} /> {bulkReceiptGenerating ? 'Generating Receipts' : 'Bulk Generate Receipts'}
          </button>
          {bulkReceiptMessage ? <small>{bulkReceiptMessage}</small> : null}
          {!writeEnabled ? <small>Read-only mode</small> : null}
        </div>

        <div className="bulk-whatsapp-panel">
          <div className="bulk-actions">
            <button type="button" onClick={() => prepareBulkQueue('welcome')}>
              <MessageCircle size={16} /> Bulk Welcome Messages
            </button>
            <button type="button" onClick={() => prepareBulkQueue('payment')}>
              <BadgeCheck size={16} /> Bulk Payment Messages
            </button>
          </div>

          {bulkQueueType ? (
            <div className="bulk-preview">
              <div className="bulk-preview-head">
                <div>
                  <p>{bulkQueueType === 'welcome' ? 'Bulk Welcome Messages' : 'Bulk Payment Messages'}</p>
                  <h3>Total count: {bulkQueue.length}</h3>
                </div>
                <button type="button" onClick={clearBulkQueue}>Close</button>
              </div>

              {bulkQueue.length ? (
                <>
                  <div className="bulk-preview-list">
                    {bulkQueue.map((item, index) => (
                      <div className={bulkQueueStarted && index === bulkQueueIndex ? 'active' : ''} key={`${item.participant.eventType}-${item.participant.mobileNumber}-${item.participant.timestamp}-${index}`}>
                        <strong>{item.name}</strong>
                        <span>{item.mobileNumber}</span>
                        <span>{item.eventType}</span>
                        <span>{item.messageType}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bulk-queue-controls">
                    {!bulkQueueStarted ? (
                      <button type="button" onClick={confirmBulkQueue}>
                        Confirm
                      </button>
                    ) : (
                      <>
                        <span>
                          Opened {bulkQueueIndex + 1} of {bulkQueue.length}: {currentBulkItem?.name}
                        </span>
                        <button type="button" onClick={markCurrentBulkMessageAsSent} disabled={!writeEnabled || markingBulkSent}>
                          {markingBulkSent ? 'Saving' : 'Mark as Sent'}
                        </button>
                        <button type="button" onClick={openNextBulkMessage} disabled={!hasNextBulkItem}>
                          Next Message
                        </button>
                        {bulkSentMessage ? <small>{bulkSentMessage}</small> : null}
                        {!writeEnabled ? <small>Read-only mode</small> : null}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="bulk-empty">No eligible participants found. Pending payments are skipped.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="participants-list">
          {filteredRows.length ? (
            filteredRows.map((participant, index) => (
              <ParticipantCard
                key={`${participant.eventType}-${participant.mobileNumber}-${participant.timestamp}-${index}`}
                participant={participant}
                rows={rows}
                writeEnabled={writeEnabled}
                onSave={saveRegistration}
              />
            ))
          ) : (
            <div className="empty-state">
              <Search size={28} />
              <p>No matching participants found.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
