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
  Share2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { buildWhatsAppMessage, normalizeWhatsAppMessage } from './whatsappMessages.js';
import bhimarathaReceiptTemplate from '../assets/receipts/bhimaratha-receipt.jpeg';
import shashtipoorthiReceiptTemplate from '../assets/receipts/shastipoorthi-receipt.jpeg';
import './styles.css';

const EVENT_DATE = 'Sunday, 02-Aug-2026';
const DEVELOPER_MODE = import.meta.env.VITE_DEVELOPER_MODE === 'true';
const ACTIVE_EVENT_YEAR = import.meta.env.VITE_ACTIVE_EVENT_YEAR || '2026';
const WHATSAPP_GROUP_HANDLED_SEAT_BASELINE = import.meta.env.VITE_WHATSAPP_GROUP_HANDLED_SEAT_BASELINE || 'D-01';
const RECEIPT_TEMPLATES = {
  shashtipoorthi: shashtipoorthiReceiptTemplate,
  bhimaratha: bhimarathaReceiptTemplate,
};
const RECEIPT_PREFIXES = { bhimaratha: 'BS26', shashtipoorthi: 'SP26' };
const RECEIPT_TEXT_COLOR = '#0B2D5C';
const receiptLayouts = {
  shashtipoorthi: {
    receiptNo: [
      { x: 95, y: 216, width: 74, height: 26 },
      { x: 565, y: 242, width: 88, height: 28 },
    ],
    date: [
      { x: 383, y: 217, width: 86, height: 22, baselineOffset: -3 },
      { x: 1392, y: 258, width: 136, height: 25, baselineOffset: -3 },
    ],
    coupleName: [
      { x: 84, y: 243, width: 382, height: 40, lineOffset: -4 },
      { x: 635, y: 310, width: 815, height: 43, lineOffset: -4 },
    ],
    seatNo: [
      { x: 182, y: 398, width: 132, height: 24 },
      { x: 1053, y: 438, width: 76, height: 24 },
    ],
  },
  bhimaratha: {
    receiptNo: [
      { x: 95, y: 216, width: 74, height: 26 },
      { x: 565, y: 242, width: 88, height: 28 },
    ],
    date: [
      { x: 383, y: 217, width: 86, height: 22, baselineOffset: -3 },
      { x: 1392, y: 258, width: 136, height: 25, baselineOffset: -3 },
    ],
    coupleName: [
      { x: 84, y: 243, width: 382, height: 40, lineOffset: -4 },
      { x: 635, y: 310, width: 815, height: 43, lineOffset: -4 },
    ],
    seatNo: [
      { x: 182, y: 398, width: 132, height: 24 },
      { x: 1053, y: 438, width: 76, height: 24 },
    ],
  },
};
const WHATSAPP_GROUP_NAMES = {
  shashtipoorthi: 'Shastipoorthi Shanthi 02-08-2026',
  bhimaratha: 'Bheemaratha Shanti 02-08-2026',
};
const WHATSAPP_CONTACT_PREFIXES = {
  shashtipoorthi: 'MVST Shasti',
  bhimaratha: 'MVST Bheema',
  pst: 'MVST PST',
};
const PAYMENT_STATUSES = ['Full Paid', 'Part Paid', 'Pending', 'Free Sponsorship'];
const PARTICIPANT_SORT_OPTIONS = [
  { value: 'latest', label: 'Latest Registration' },
  { value: 'seat-asc', label: 'Seat Number (Ascending)' },
  { value: 'seat-desc', label: 'Seat Number (Descending)' },
  { value: 'name-asc', label: 'Participant Name (A-Z)' },
];

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

function isFreeSponsorshipStatus(status) {
  return String(status || '').trim().toLowerCase() === 'free sponsorship';
}

function normalizeRow(row, headerMap, source) {
  const eventType = source.id;
  const paidAmount = numberFrom(getCell(row, headerMap, ['Paid Amount']));
  const contribution = EVENTS[eventType].contribution;
  const calculatedStatus =
    paidAmount >= contribution ? 'Full Paid' : paidAmount > 0 ? 'Part Paid' : 'Pending';
  const sheetPaymentStatus = getCell(row, headerMap, ['Payment Status']);
  const paymentStatus = sheetPaymentStatus || calculatedStatus;
  const balance = isFreeSponsorshipStatus(paymentStatus) ? 0 : Math.max(contribution - paidAmount, 0);

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
    receiptDate: getCell(row, headerMap, ['Receipt Date']),
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
  const raw = String(receiptNo || '').trim();
  const prefix = receiptPrefix(eventType);
  const match = raw.match(new RegExp(`^${prefix}-(\\d{1,3})$`));
  if (!match) return null;
  return Number(match[1]);
}

function formatReceiptNumber(eventType, number) {
  return `${receiptPrefix(eventType)}-${Number(number)}`;
}

function normalizeReceiptNumber(receiptNo, eventType) {
  const value = receiptNumberValue(receiptNo, eventType);
  return value === null ? '' : formatReceiptNumber(eventType, value);
}

function hasValidReceiptBookNumber(participant) {
  return receiptNumberValue(participant?.receiptNo, participant?.eventType) !== null;
}

function receiptBookAudit(rows, eventType) {
  const eventRows = rows.filter((row) => row.eventType === eventType);
  const counts = new Map();
  const malformed = [];
  let blank = 0;
  let highest = 0;
  eventRows.forEach((row) => {
    const raw = String(row.receiptNo || '').trim();
    if (!raw) {
      blank += 1;
      return;
    }
    const number = receiptNumberValue(raw, eventType);
    if (!number) {
      malformed.push(row);
      return;
    }
    highest = Math.max(highest, number);
    counts.set(String(number), (counts.get(String(number)) || 0) + 1);
  });
  const duplicateReceipts = [...counts.entries()].filter(([, count]) => count > 1);
  return {
    blank,
    malformed,
    duplicateReceipts,
    lastUsed: highest ? formatReceiptNumber(eventType, highest) : 'None',
    suggestedNext: formatReceiptNumber(eventType, highest + 1),
  };
}

function sortReceiptSequenceRows(rows) {
  return [...rows].sort((a, b) => {
    const timeA = timestampValue(a.timestamp);
    const timeB = timestampValue(b.timestamp);
    if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
    if (timeA !== null && timeB === null) return -1;
    if (timeA === null && timeB !== null) return 1;
    return compareSeatNumbers(a, b, 'desc');
  });
}

function suggestedReceiptNumber(rows, participant) {
  const existingReceiptNo = normalizeReceiptNumber(participant.receiptNo, participant.eventType);
  if (existingReceiptNo) return existingReceiptNo;
  const eventRows = sortReceiptSequenceRows(
    rows.filter((row) => row.eventType === participant.eventType && isReceiptEligible(row)),
  );
  const usedNumbers = new Set(
    eventRows
      .map((row) => receiptNumberValue(row.receiptNo, participant.eventType))
      .filter(Boolean),
  );
  let nextNumber = 1;
  for (const row of eventRows) {
    const existing = receiptNumberValue(row.receiptNo, participant.eventType);
    if (existing) continue;
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const suggestion = formatReceiptNumber(participant.eventType, nextNumber);
    usedNumbers.add(nextNumber);
    if (row.id === participant.id) return suggestion;
  }
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return formatReceiptNumber(participant.eventType, nextNumber);
}

function receiptConflictMessage(rows, participant, receiptNo) {
  const raw = String(receiptNo || '').trim();
  if (!raw) return '';
  const number = receiptNumberValue(raw, participant.eventType);
  if (!number) return `Invalid event-wise receipt number. Suggested next available receipt no: ${suggestedReceiptNumber(rows, participant)}`;
  const conflict = rows.find((row) =>
    row.id !== participant.id &&
    row.eventType === participant.eventType &&
    receiptNumberValue(row.receiptNo, participant.eventType) === number,
  );
  if (!conflict) return '';
  return `Receipt No. ${raw} is already used. Suggested next available receipt no: ${suggestedReceiptNumber(rows, participant)}`;
}

function receiptFileName(participant, receiptNo) {
  const event = eventDisplayName(participant.eventType).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Event';
  const seat = String(participant.seatNo || 'No-Seat').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const receipt = String(receiptNo || participant.receiptNo || 'No-Receipt').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `MVST-Receipt-${event}-${seat}-${receipt}.jpg`;
}

function loadReceiptImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load receipt template'));
    image.src = src;
  });
}

function drawReceiptText(ctx, textValue, x, y, fontSize, align = 'left', options = {}) {
  const {
    weight = 600,
    family = 'Georgia, "Times New Roman", serif',
  } = options;
  ctx.save();
  ctx.font = `${weight} ${fontSize}px ${family}`;
  ctx.fillStyle = RECEIPT_TEXT_COLOR;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.58)';
  ctx.shadowBlur = 2;
  ctx.lineWidth = Math.max(1.3, fontSize / 16);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.strokeText(textValue, x, y);
  ctx.fillText(textValue, x, y);
  ctx.restore();
}

function fitReceiptText(ctx, textValue, box, options = {}) {
  const {
    maxFont = 22,
    minFont = 11,
    align = 'left',
    weight = 600,
    family = 'Georgia, "Times New Roman", serif',
    lineHeight = 1.22,
  } = options;
  const lines = Array.isArray(textValue)
    ? textValue.map((line) => String(line || '').trim()).filter(Boolean)
    : String(textValue || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return;
  let fontSize = maxFont;
  ctx.save();
  while (fontSize > minFont) {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    const longestLineWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
    const totalHeight = lines.length * fontSize * lineHeight;
    if (longestLineWidth <= box.width && totalHeight <= box.height) break;
    fontSize -= 1;
  }
  ctx.restore();
  const x = align === 'center' ? box.x + box.width / 2 : align === 'right' ? box.x + box.width : box.x;
  const middleY = box.y + box.height / 2 + Number(box.baselineOffset || box.lineOffset || 0);
  const lineGap = fontSize * lineHeight;
  const firstY = middleY - ((lines.length - 1) * lineGap) / 2;
  lines.forEach((line, index) => {
    drawReceiptText(ctx, line, Math.round(x), Math.round(firstY + index * lineGap), fontSize, align, { weight, family });
  });
}

function formatDateParts(day, month, year) {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}

function registrationTimestampDate(timestamp) {
  const raw = String(timestamp || '').trim();
  if (!raw) return null;

  const indianDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (indianDate) {
    const day = Number(indianDate[1]);
    const month = Number(indianDate[2]);
    const year = Number(indianDate[3].length === 2 ? `20${indianDate[3]}` : indianDate[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      return formatDateParts(day, month, year);
    }
  }

  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?!T)/);
  if (isoDateOnly) {
    return formatDateParts(Number(isoDateOnly[3]), Number(isoDateOnly[2]), Number(isoDateOnly[1]));
  }

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function receiptDateForParticipant(participant) {
  return registrationTimestampDate(participant.timestamp);
}

function isReceiptEligible(participant) {
  return (
    String(participant.paymentStatus || '').trim() === 'Full Paid' &&
    Number(participant.balance || 0) === 0 &&
    !isFreeSponsorship(participant)
  );
}

function receiptUnavailableMessage(participant) {
  if (isFreeSponsorship(participant)) {
    return 'Payment receipt is not available for Free Sponsorship because no money was received.';
  }
  return 'Receipt will be available after the full amount is received.';
}

function cleanReceiptNamePart(value) {
  return String(value || '')
    .replace(/\s+-\s+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function receiptCoupleNameLines(ctx, participant, box) {
  const groomName = cleanReceiptNamePart(participant.groomName) || 'Groom';
  const brideName = cleanReceiptNamePart(participant.brideName);
  const singleLine = brideName ? `Sri. ${groomName} & Smt. ${brideName}` : `Sri. ${groomName}`;
  const family = 'Georgia, "Times New Roman", serif';
  const weight = 600;
  const testFontSize = 18;
  ctx.save();
  ctx.font = `${weight} ${testFontSize}px ${family}`;
  const fitsSingleLine = ctx.measureText(singleLine).width <= box.width;
  ctx.restore();
  if (fitsSingleLine || !brideName) return [singleLine];
  return [`Sri. ${groomName}`, `& Smt. ${brideName}`];
}

async function generateReceiptJpg(participant, receiptNo) {
  if (!isReceiptEligible(participant)) {
    throw new Error(receiptUnavailableMessage(participant));
  }
  if (receiptNumberValue(receiptNo, participant.eventType) === null) {
    throw new Error('Valid event-wise receipt number is required');
  }
  const receiptDate = receiptDateForParticipant(participant);
  if (!receiptDate) {
    throw new Error('Registration timestamp missing');
  }
  const template = RECEIPT_TEMPLATES[participant.eventType];
  if (!template) throw new Error('Receipt template is not configured for this event');
  const image = await loadReceiptImage(template);
  const outputWidth = 3000;
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = outputWidth / sourceWidth;
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = Math.round(sourceHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);

  const layout = receiptLayouts[participant.eventType];
  if (!layout) throw new Error('Receipt layout is not configured for this event');
  const safeSeatNo = String(participant.seatNo || '').trim();
  const safeReceiptNo = normalizeReceiptNumber(receiptNo, participant.eventType);
  const drawBoxes = (boxes, text, options) => boxes.forEach((box) => fitReceiptText(ctx, text, box, options));
  drawBoxes(layout.receiptNo, safeReceiptNo, { maxFont: 18, minFont: 10, align: 'center' });
  drawBoxes(layout.date, receiptDate, { maxFont: 15, minFont: 9, align: 'center' });
  drawBoxes(layout.seatNo, safeSeatNo, { maxFont: 23, minFont: 11, align: 'center' });
  layout.coupleName.forEach((box) => {
    fitReceiptText(ctx, receiptCoupleNameLines(ctx, participant, box), box, {
      maxFont: box.width > 500 ? 20 : 16,
      minFont: 8,
      align: 'center',
      lineHeight: 1.14,
    });
  });

  return canvas.toDataURL('image/jpeg', 0.95);
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
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
  return sortParticipants(rows.filter((row) =>
    row.eventType === eventType &&
    isReceiptEligible(row) &&
    Boolean(receiptDateForParticipant(row)) &&
    String(row.seatNo || '').trim() &&
    !row.receiptGenerated,
  ), 'latest');
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

function compareSeatNumbers(a, b, direction = 'desc') {
  const rankA = seatRank(a.seatNo);
  const rankB = seatRank(b.seatNo);
  if (rankA !== null && rankB !== null && rankA !== rankB) {
    return direction === 'asc' ? rankA - rankB : rankB - rankA;
  }
  if (rankA !== null && rankB === null) return -1;
  if (rankA === null && rankB !== null) return 1;
  return participantDisplayName(a).localeCompare(participantDisplayName(b));
}

function sortParticipants(rows, sortMode = 'latest') {
  return [...rows].sort((a, b) => {
    if (sortMode === 'seat-asc') return compareSeatNumbers(a, b, 'asc');
    if (sortMode === 'seat-desc') return compareSeatNumbers(a, b, 'desc');
    if (sortMode === 'name-asc') return participantDisplayName(a).localeCompare(participantDisplayName(b));
    const timeA = timestampValue(a.timestamp);
    const timeB = timestampValue(b.timestamp);
    if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
    if (timeA !== null && timeB === null) return -1;
    if (timeA === null && timeB !== null) return 1;
    return compareSeatNumbers(a, b, 'desc');
  });
}

function participantSortLabel(sortMode) {
  return PARTICIPANT_SORT_OPTIONS.find((option) => option.value === sortMode)?.label || PARTICIPANT_SORT_OPTIONS[0].label;
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

function isFreeSponsorship(participant) {
  return isFreeSponsorshipStatus(participant.paymentStatus);
}

function lettersToNumber(letters) {
  return String(letters || '').toUpperCase().split('').reduce((value, letter) => value * 26 + (letter.charCodeAt(0) - 64), 0);
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

function seatRank(seatNo) {
  return parseSeatValue(seatNo)?.rank ?? null;
}

function seatAuditForEvent(rows, eventType) {
  const counts = new Map();
  const rowSeatCounts = new Map();
  const invalidSeats = [];
  const missingSeats = [];
  let highest = null;
  rows.filter((row) => row.eventType === eventType).forEach((row) => {
    const rawSeat = String(row.seatNo || '').trim();
    if (!rawSeat) {
      missingSeats.push(row);
      return;
    }
    const parsed = parseSeatValue(rawSeat);
    if (!parsed) {
      invalidSeats.push(row);
      return;
    }
    counts.set(parsed.normalized, (counts.get(parsed.normalized) || 0) + 1);
    rowSeatCounts.set(parsed.row, (rowSeatCounts.get(parsed.row) || 0) + 1);
    if (!highest || parsed.rank > highest.rank) highest = parsed;
  });
  const duplicateSeats = [...counts.entries()].filter(([, count]) => count > 1);
  const currentRow = highest?.row || 'A';
  return {
    lastAcceptedSeat: highest?.normalized || 'None',
    suggestedNextSeat: nextSeatAfter(highest),
    currentRow,
    occupiedInCurrentRow: highest ? rowSeatCounts.get(currentRow) || 0 : 0,
    duplicateSeats,
    invalidSeats,
    missingSeats,
  };
}

function seatConflictMessage(rows, participant, seatNo) {
  const parsed = parseSeatValue(seatNo);
  if (!String(seatNo || '').trim()) return '';
  if (!parsed) {
    return `Invalid seat format. Suggested next available seat: ${seatAuditForEvent(rows, participant.eventType).suggestedNextSeat}`;
  }
  const conflict = rows.find((row) =>
    row.id !== participant.id &&
    row.eventType === participant.eventType &&
    parseSeatValue(row.seatNo)?.normalized === parsed.normalized,
  );
  if (!conflict) return '';
  return `Seat ${parsed.normalized} is already allotted. Suggested next available seat: ${seatAuditForEvent(rows, participant.eventType).suggestedNextSeat}`;
}

function isSeatAfterBaseline(seatNo, baseline = WHATSAPP_GROUP_HANDLED_SEAT_BASELINE) {
  const seatValue = seatRank(seatNo);
  const baselineValue = seatRank(baseline);
  return seatValue !== null && baselineValue !== null && seatValue > baselineValue;
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

function buildWhatsAppGroupPreview(rows, eventType, pstAdmins = []) {
  const eventRows = sortParticipants(rows.filter((row) => row.eventType === eventType), 'latest');
  const futureRows = sortParticipants(eventRows.filter((row) => isSeatAfterBaseline(row.seatNo)), 'latest');
  const seenMobiles = new Map();
  const validParticipants = [];
  const missingMobileParticipants = [];
  let duplicateCount = 0;

  futureRows.forEach((participant) => {
    const validation = mobileValidationStatus(participant.mobileNumber);
    const name = participantDisplayName(participant);
    if (validation.status !== 'ok' || !validation.normalized) {
      missingMobileParticipants.push({
        name,
        seatNo: participant.seatNo || '',
        issue: validation.issue,
      });
      return;
    }
    if (seenMobiles.has(validation.normalized)) {
      duplicateCount += 1;
      return;
    }
    seenMobiles.set(validation.normalized, true);
    validParticipants.push({
      name,
      seatNo: participant.seatNo || '',
      mobileNumber: validation.normalized,
    });
  });

  const normalizedAdmins = pstAdmins.map((admin) => ({
    name: admin.name || 'PST Member',
    mobileNumber: normalizeIndianMobileNumber(admin.mobileNumber),
  })).filter((admin) => admin.name && mobileValidationStatus(admin.mobileNumber).status === 'ok');

  return {
    eventType,
    groupName: WHATSAPP_GROUP_NAMES[eventType],
    eventLabel: eventDisplayName(eventType),
    totalParticipants: eventRows.length,
    handledSeatBaseline: WHATSAPP_GROUP_HANDLED_SEAT_BASELINE,
    futureRegistrations: futureRows.length,
    validParticipants,
    missingMobileParticipants,
    duplicateCount,
    pstAdmins: normalizedAdmins,
  };
}

function contactDisplayName(prefix, name) {
  return `${prefix} - ${String(name || '').trim() || 'Contact'}`;
}

function vcfEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildVcfContact(fullName, normalizedMobile) {
  const phone = String(normalizedMobile || '').startsWith('+')
    ? String(normalizedMobile)
    : `+${String(normalizedMobile || '').replace(/\D/g, '')}`;
  const safeName = vcfEscape(fullName);
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${safeName}`,
    `N:${safeName};;;;`,
    `TEL;TYPE=CELL:${phone}`,
    'END:VCARD',
  ].join('\r\n');
}

function buildGroupContactRows(preview) {
  const seenMobiles = new Set();
  const contacts = [];
  const addContact = (prefix, name, mobileNumber) => {
    const normalizedMobile = normalizeIndianMobileNumber(mobileNumber);
    if (!normalizedMobile || seenMobiles.has(normalizedMobile)) return;
    seenMobiles.add(normalizedMobile);
    contacts.push({
      name: contactDisplayName(prefix, name),
      mobileNumber: normalizedMobile,
    });
  };

  preview.validParticipants.forEach((participant) =>
    addContact(WHATSAPP_CONTACT_PREFIXES[preview.eventType], participant.name, participant.mobileNumber),
  );

  return contacts;
}

function buildCombinedGroupContactRows(previews) {
  const seenMobiles = new Set();
  const contacts = [];
  const addContacts = (rows) => {
    rows.forEach((contact) => {
      if (!contact.mobileNumber || seenMobiles.has(contact.mobileNumber)) return;
      seenMobiles.add(contact.mobileNumber);
      contacts.push(contact);
    });
  };

  previews.forEach((preview) => addContacts(buildGroupContactRows(preview)));
  return contacts;
}

function buildContactsVcf(contacts) {
  return contacts.map((contact) => buildVcfContact(contact.name, contact.mobileNumber)).join('\r\n');
}

function downloadTextFile(fileName, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function groupContactFileName(preview) {
  return `${preview.eventType}-new-whatsapp-contacts-after-${preview.handledSeatBaseline}.vcf`
    .replace(/[^a-z0-9.-]+/gi, '-')
    .toLowerCase();
}

function buildGroupClipboardText(preview) {
  const participantNames = preview.validParticipants.map((participant) =>
    contactDisplayName(WHATSAPP_CONTACT_PREFIXES[preview.eventType], participant.name),
  );
  return [
    `WhatsApp Group: ${preview.groupName}`,
    `Event: ${preview.eventLabel}`,
    '',
    'Participant contact names to search in WhatsApp:',
    ...participantNames,
    '',
    'Manual steps:',
    `Existing participants handled through Seat No. ${preview.handledSeatBaseline}.`,
    '1. Download and import the new-participant VCF contacts.',
    '2. Wait briefly for WhatsApp contacts to sync.',
    `3. Open the existing WhatsApp group: ${preview.groupName}`,
    `4. Search using ${WHATSAPP_CONTACT_PREFIXES[preview.eventType]}.`,
    '5. Add only the new contacts shown in this section.',
  ].join('\n');
}

function buildGroupMobileNumbersText(preview) {
  return buildGroupContactRows(preview)
    .map((contact) => `+${contact.mobileNumber}`)
    .join('\n');
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

function sponsorCategory(sponsor) {
  return sponsor.category || sponsor.canonicalCategory || 'Sponsorship';
}

function sponsorUnit(sponsor) {
  return sponsor.unit || sponsorCategory(sponsor);
}

function sponsorQuantity(sponsor) {
  return Number(sponsor.confirmedQuantity || sponsor.sponsored2026 || 0);
}

function sponsorPreviousQuantity(sponsor) {
  return Number(sponsor.sponsored2025 || sponsor.quantitySponsored || 0);
}

function sponsorEventName(sponsor) {
  return sponsor.eventName || 'the upcoming trust event';
}

function sponsorAmount(sponsor) {
  return Number(sponsor.confirmedAmount || sponsor.amount || sponsor.actualValue || 0);
}

function sponsorQuantityText(quantity, unit) {
  if (!Number(quantity)) return unit || 'sponsorship';
  return `${quantity} ${unit}${Number(quantity) === 1 || String(unit).endsWith('s') ? '' : 's'}`;
}

function sponsorContributionText(sponsor) {
  const quantity = sponsorQuantity(sponsor);
  return sponsorQuantityText(quantity, sponsorUnit(sponsor));
}

function sponsorPreviousContributionText(sponsor) {
  const quantity = sponsorPreviousQuantity(sponsor);
  return sponsorQuantityText(quantity, sponsorUnit(sponsor));
}

const DONOR_JOURNEY_STEPS = [
  {
    type: 'appeal',
    label: '1. Appeal',
    title: '1. Appeal Message',
    sentField: 'appealSent',
    dateField: 'appealSentDate',
  },
  {
    type: 'thank-you',
    label: '2. Confirmation',
    title: '2. Sponsorship Confirmation',
    sentField: 'confirmationSent',
    dateField: 'confirmationSentDate',
  },
  {
    type: 'payment-received',
    label: '3. Payment + Receipt',
    title: '3. Payment Received + Receipt + Invitation',
    sentField: 'paymentMessageSent',
    dateField: 'paymentMessageSentDate',
  },
  {
    type: 'post-event-thank-you',
    label: '4. Post-Event Thanks',
    title: '4. Post-Event Thank You',
    sentField: 'postEventSent',
    dateField: 'postEventSentDate',
  },
];

function donorJourneyStep(messageType) {
  return DONOR_JOURNEY_STEPS.find((step) => step.type === messageType) || DONOR_JOURNEY_STEPS[0];
}

function donorJourneySent(donor, messageType) {
  const step = donorJourneyStep(messageType);
  if (messageType === 'appeal') return Boolean(donor[step.sentField] || donor.whatsAppSent);
  return Boolean(donor[step.sentField]);
}

function donorJourneyDate(donor, messageType) {
  const step = donorJourneyStep(messageType);
  if (messageType === 'appeal') return donor[step.dateField] || donor.sentDate || '';
  return donor[step.dateField] || '';
}

function donorJourneySentUpdates(messageType) {
  const step = donorJourneyStep(messageType);
  const sentDate = deliveryDateStamp();
  return {
    [step.sentField]: true,
    [step.dateField]: sentDate,
    ...(messageType === 'appeal' ? { whatsAppSent: true, sentDate } : {}),
  };
}

function isActiveEventYear(eventYear) {
  const year = String(eventYear || '').trim();
  return !year || year === ACTIVE_EVENT_YEAR;
}

function buildMangalyaDonorAppealMessage(donor) {
  const category = sponsorCategory(donor);
  const eventName = sponsorEventName(donor);
  const amount = sponsorAmount(donor);
  return `🙏 Namaskara ${donor.sponsorName || donor.donorName || 'Respected Sponsor'} Avare,

We hope you and your family are doing well by the grace of Vasavi Matha.

Previously, you generously sponsored ${sponsorPreviousContributionText(donor)} for our trust activity. We sincerely thank you for your valuable support.

This time, Mane Manege Vasavi Seva Trust (R) is organizing:

${eventName}

${amount ? `${category} Sponsorship: ${formatCurrency(amount)}` : `${category} Sponsorship`}

With folded hands, we request your continued support once again.

Your generosity will help us continue this noble tradition and bless many deserving senior couples.

Kindly reply to this message or contact us if you wish to continue your support.

🙏 Thank you for your continued trust and generosity.

Manemanege Vasavi Seva Trust (R) & Team`;
}

function buildMangalyaDonorThankYouMessage(donor) {
  const eventName = sponsorEventName(donor);
  return `🙏 Namaskara ${donor.sponsorName || donor.donorName || 'Respected Sponsor'} Avare,

Thank you so much for your kind and generous confirmation to sponsor ${sponsorContributionText(donor)} for ${eventName}.

Your valuable support means a lot to us and will help us continue this noble seva of blessing senior couples through this sacred ceremony.

💛 Confirmed Sponsorship: ${sponsorContributionText(donor)}

Our Trust representative will get in touch with you shortly regarding the contribution.

May Vasavi Matha bless you and your family with good health, happiness and prosperity.

🙏 With heartfelt gratitude,

Manemanege Vasavi Seva Trust (R) & Team`;
}

function buildMangalyaDonorPaymentReceivedMessage(donor) {
  const eventName = sponsorEventName(donor);
  const amount = sponsorAmount(donor);
  return `🙏 Namaskara ${donor.sponsorName || donor.donorName || 'Respected Sponsor'} Avare,

We are pleased to confirm receipt of your generous contribution towards ${sponsorContributionText(donor)} for ${eventName}.

💛 Sponsored: ${sponsorContributionText(donor)}
💰 Contribution Received: ${amount ? formatCurrency(amount) : 'As confirmed'}

Your support is deeply appreciated and will help us conduct this sacred event successfully.

📄 Your official receipt has been generated and is shared herewith.

📩 We hope you have received the invitation card handed over by our Trust representative.

💐 We cordially invite you and your family to grace this auspicious occasion with your esteemed presence and receive the blessings of Vasavi Matha.

May Vasavi Matha shower her choicest blessings upon you and your family with good health, happiness, prosperity and success in all your endeavours.

🙏 Your generosity and continued support inspire us to carry forward this noble seva. We sincerely thank you for being a part of this sacred initiative.

With heartfelt gratitude,

Manemanege Vasavi Seva Trust (R) & Team`;
}

function buildMangalyaDonorPostEventThankYouMessage(donor) {
  const eventName = sponsorEventName(donor);
  return `🙏 Namaskara ${donor.sponsorName || donor.donorName || 'Respected Sponsor'} Avare,

On behalf of Manemanege Vasavi Seva Trust (R), we express our heartfelt gratitude for your generous sponsorship of ${sponsorContributionText(donor)}.

With the blessings of Vasavi Matha and the generous support of donors like you, ${eventName} was conducted successfully.

Your contribution played a valuable role in making this sacred event a grand success and in blessing many senior couples.

🙏 We sincerely thank you for your trust, generosity and continued support.

May Vasavi Matha bless you and your family with good health, happiness, prosperity and success.

With heartfelt gratitude,

Manemanege Vasavi Seva Trust (R) & Team`;
}

function makeMangalyaDonorWhatsAppUrl(donor, messageType = 'appeal') {
  const normalizedMobile = normalizeIndianMobileNumber(donor.contactNo);
  const messageMap = {
    appeal: buildMangalyaDonorAppealMessage,
    'thank-you': buildMangalyaDonorThankYouMessage,
    'payment-received': buildMangalyaDonorPaymentReceivedMessage,
    'post-event-thank-you': buildMangalyaDonorPostEventThankYouMessage,
  };
  const messageBuilder = messageMap[messageType] || buildMangalyaDonorAppealMessage;
  const message = messageBuilder(donor);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedMobile}?text=${encodedText}`;
}

function donorMobileIsValid(donor) {
  return mobileValidationStatus(donor.contactNo).status === 'ok';
}

function previousDonationAmount(donor) {
  const explicitAmount = Number(donor.previousDonationAmount || 0);
  if (explicitAmount > 0) return explicitAmount;
  const year = String(donor.eventYear || '').trim();
  const typeText = [donor.contributionType, donor.category, donor.canonicalCategory].join(' ').toLowerCase();
  if (year && year !== ACTIVE_EVENT_YEAR && typeText.includes('general donation')) {
    return Number(donor.receivedAmount || donor.confirmedAmount || donor.amount || 0);
  }
  return 0;
}

function previousDonationYear(donor) {
  return donor.previousDonationYear || (String(donor.eventYear || '').trim() !== ACTIVE_EVENT_YEAR ? donor.eventYear : '');
}

function isPreviousDonor(donor) {
  return previousDonationAmount(donor) > 0;
}

function buildPreviousDonorAppealMessage(donor) {
  return `🙏 Jai Vasavi 🙏

Dear ${sponsorDisplayName(donor)},

With your generous support, last year's Shanthi Mahotsava 2025 event was a grand success.

This year also, Manemanege Vasavi Seva Trust is organizing:

🌸 4th Samoohika Shashtipoorthi Shanthi
🌸 2nd Samoohika Bheemaratha Shanthi

Date: Sunday, 02-Aug-2026
Venue: Shubh Convention, JP Nagar, Bengaluru

We humbly request your continued support and blessings by contributing towards this noble event once again.

Your contribution, big or small, will help us serve our community.

For sponsorship or donations, kindly contact us.

Thank you for your continued trust and support.

🙏 Manemanege Vasavi Seva Trust & Team`;
}

function makePreviousDonorWhatsAppUrl(donor) {
  const normalizedMobile = normalizeIndianMobileNumber(donor.contactNo);
  const encodedText = encodeURIComponent(buildPreviousDonorAppealMessage(donor));
  return `https://wa.me/${normalizedMobile}?text=${encodedText}`;
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
  const [status, setStatus] = useState('Loading Mangalya sponsorship...');
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
      const response = await fetch('/api/mangalya-sponsorship' + (forceRefresh ? '/refresh' : ''), {
        method: forceRefresh ? 'POST' : 'GET',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || `Mangalya sponsorship API returned ${response.status}`);
      if (!aliveRef.current) return;
      applyPayload(payload);
    } catch (loadError) {
      if (!aliveRef.current) return;
      setError(loadError.message || 'Unable to load Mangalya sponsorship');
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
      const response = await fetch(`/api/mangalya-sponsorship/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Mangalya sponsorship update returned ${response.status}`);
      }
      applyPayload(payload);
      return payload;
    },
  };
}

function useSponsorshipRequirements() {
  const [requirements, setRequirements] = useState([]);
  const [status, setStatus] = useState('Loading sponsorship requirements...');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  function applyPayload(payload) {
    const refreshedAt = payload.refreshedAt || new Date().toISOString();
    setRequirements(payload.rows || []);
    setStatus(`Requirement Master. Last refreshed: ${formatRefreshTime(refreshedAt)}`);
    setError(payload.notice || '');
  }

  async function load(forceRefresh = false, aliveRef = { current: true }) {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/sponsorship-requirements' + (forceRefresh ? '/refresh' : ''), {
        method: forceRefresh ? 'POST' : 'GET',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || `Sponsorship requirements API returned ${response.status}`);
      if (!aliveRef.current) return;
      applyPayload(payload);
    } catch (loadError) {
      if (!aliveRef.current) return;
      setError(loadError.message || 'Unable to load sponsorship requirements');
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
    requirements,
    status,
    error,
    isRefreshing,
    refresh: () => load(true),
  };
}

function useWhatsAppGroupConfig() {
  const [pstAdmins, setPstAdmins] = useState([]);
  const [status, setStatus] = useState('Loading PST admins...');
  const [error, setError] = useState('');
  const [canCreateGroupsDirectly, setCanCreateGroupsDirectly] = useState(false);

  async function load(aliveRef = { current: true }) {
    setError('');
    try {
      const response = await fetch('/api/whatsapp-group-config', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || `WhatsApp group config returned ${response.status}`);
      if (!aliveRef.current) return;
      setPstAdmins(payload.pstAdmins || []);
      setCanCreateGroupsDirectly(Boolean(payload.canCreateGroupsDirectly));
      setStatus(payload.reason || 'Assisted WhatsApp group workflow');
    } catch (loadError) {
      if (!aliveRef.current) return;
      setPstAdmins([]);
      setCanCreateGroupsDirectly(false);
      setError(loadError.message || 'Unable to load PST admins');
      setStatus('Assisted WhatsApp group workflow');
    }
  }

  useEffect(() => {
    const aliveRef = { current: true };
    load(aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return {
    pstAdmins,
    status,
    error,
    canCreateGroupsDirectly,
    refresh: () => load(),
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

function AdminEditPanel({ participant, rows, writeEnabled, onSave }) {
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
      const seatMessage = seatConflictMessage(rows, participant, form.seatNo);
      if (seatMessage) throw new Error(seatMessage);
      const parsedSeat = parseSeatValue(form.seatNo);
      await onSave(participant.id, {
        paidAmount: form.paidAmount,
        paymentStatus: form.paymentStatus,
        seatNo: parsedSeat ? parsedSeat.normalized : form.seatNo,
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
          {PAYMENT_STATUSES.map((statusValue) => <option key={statusValue}>{statusValue}</option>)}
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
      {seatConflictMessage(rows, participant, form.seatNo) ? <span className="save-message warning">{seatConflictMessage(rows, participant, form.seatNo)}</span> : null}
      {message ? <span className="save-message">{message}</span> : null}
    </div>
  );
}

function ReceiptPanel({ participant, rows, writeEnabled, onSave }) {
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [receiptNo, setReceiptNo] = useState(participant.receiptNo || '');
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState('');
  const mobileValidation = mobileValidationStatus(participant.mobileNumber);
  const canShareWhatsApp = mobileValidation.status === 'ok';
  const paymentReceiptEligible = isReceiptEligible(participant);
  const validReceiptNumber = hasValidReceiptBookNumber(participant);
  const savedReceiptNo = normalizeReceiptNumber(participant.receiptNo, participant.eventType);
  const validTimestampDate = receiptDateForParticipant(participant);
  const suggestedReceiptNo = suggestedReceiptNumber(rows, participant);
  const activeReceiptNo = validReceiptNumber ? savedReceiptNo : suggestedReceiptNo;
  const receiptReady = paymentReceiptEligible && Boolean(activeReceiptNo) && Boolean(validTimestampDate);
  const hasSeatNo = Boolean(String(participant.seatNo || '').trim());
  const receiptAudit = receiptBookAudit(rows, participant.eventType);

  useEffect(() => {
    setReceiptNo(participant.receiptNo || '');
    setReceiptDataUrl('');
    setPreviewOpen(false);
    setMessage('');
  }, [participant]);

  async function ensureReceiptImage() {
    if (!String(participant.seatNo || '').trim()) {
      setMessage('Seat No is required before receipt generation');
      return null;
    }
    setGenerating(true);
    setMessage('');
    const nextNo = activeReceiptNo;
    try {
      const dataUrl = await generateReceiptJpg(participant, nextNo);
      setReceiptDataUrl(dataUrl);
      setReceiptNo(nextNo);
      return dataUrl;
    } catch (error) {
      setMessage(error.message || 'Unable to generate receipt');
      return null;
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreviewReceipt() {
    const dataUrl = receiptDataUrl || await ensureReceiptImage();
    if (dataUrl) setPreviewOpen(true);
  }

  async function handleDownloadReceipt() {
    const dataUrl = receiptDataUrl || await ensureReceiptImage();
    if (!dataUrl) return;
    downloadReceipt(dataUrl, participant, receiptNo || activeReceiptNo);
  }

  async function handleShareReceipt() {
    if (!canShareWhatsApp) {
      setMessage('Valid mobile number is required for WhatsApp sharing');
      return;
    }
    const dataUrl = receiptDataUrl || await ensureReceiptImage();
    if (!dataUrl) return;
    const currentReceiptNo = receiptNo || activeReceiptNo;
    const filename = receiptFileName(participant, currentReceiptNo);
    const file = dataUrlToFile(dataUrl, filename);
    const shareText = `MVST receipt for ${participantDisplayName(participant)} - ${currentReceiptNo}`;
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'MVST Receipt', text: shareText });
        setMessage('Receipt shared. Please confirm it in WhatsApp.');
        return;
      } catch (shareError) {
        setMessage('Share cancelled or blocked. Downloading receipt and opening WhatsApp Web fallback.');
      }
    } else {
      setMessage('Image auto-attach is not supported here. Receipt downloaded; attach it manually in WhatsApp Web.');
    }
    downloadReceipt(dataUrl, participant, currentReceiptNo);
    const normalizedMobile = normalizeIndianMobileNumber(participant.mobileNumber);
    const encodedText = encodeURIComponent(shareText + '\n\nPlease find the receipt image attached manually.');
    window.open(`https://web.whatsapp.com/send?phone=${normalizedMobile}&text=${encodedText}`, '_blank', 'noopener,noreferrer');
  }

  async function saveReceiptNumber() {
    if (!writeEnabled || !participant.id) {
      setMessage('Read-only mode');
      return;
    }
    if (!paymentReceiptEligible) {
      setMessage(receiptUnavailableMessage(participant));
      return;
    }
    if (!validTimestampDate) {
      setMessage('Registration timestamp missing');
      return;
    }
    if (!hasSeatNo) {
      setMessage('Seat No is required before receipt generation');
      return;
    }
    const nextNo = activeReceiptNo;
    const conflictMessage = receiptConflictMessage(rows, participant, nextNo);
    if (conflictMessage) {
      setMessage(conflictMessage);
      return;
    }
    setGenerating(true);
    setMessage('');
    try {
      await onSave(participant.id, {
        receiptNo: nextNo,
        receiptGenerated: true,
      });
      setReceiptNo(nextNo);
      setMessage('Receipt number saved to Google Sheet');
    } catch (error) {
      setMessage(error.message || 'Unable to save receipt number');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="receipt-panel">
      <div className="receipt-panel-head">
        <div>
          <span>Receipt Management</span>
          <strong>{validReceiptNumber ? savedReceiptNo : `Suggested ${suggestedReceiptNo}`}</strong>
        </div>
        {participant.receiptGenerated ? <StatusPill tone="success">&#9989; Receipt Generated</StatusPill> : <StatusPill tone="neutral">Receipt Pending</StatusPill>}
      </div>
      <div className="receipt-meta-grid">
        <p><span>Seat No</span>{participant.seatNo || 'Not entered'}</p>
        <p><span>Receipt No</span>{validReceiptNumber ? savedReceiptNo : 'Not saved yet'}</p>
        {!validReceiptNumber ? <p><span>Suggested Receipt No.</span>{suggestedReceiptNo}</p> : null}
        <p><span>Last Used Receipt No.</span>{receiptAudit.lastUsed}</p>
        <p><span>Suggested Next Receipt No.</span>{receiptAudit.suggestedNext}</p>
        <p><span>Receipt Date Source</span>{validTimestampDate || 'Registration timestamp missing'}</p>
        <p><span>Total Amount</span>{formatCurrency(participant.contribution)}</p>
        <p><span>Amount Received</span>{formatCurrency(participant.paidAmount)}</p>
        <p><span>Balance</span>{formatCurrency(participant.balance)}</p>
      </div>
      {receiptReady ? (
        <div className="receipt-actions-row">
          <button type="button" onClick={handlePreviewReceipt} disabled={generating || !hasSeatNo}>
            <FileText size={16} /> {generating ? 'Generating' : 'Preview Receipt'}
          </button>
          <button type="button" onClick={handleDownloadReceipt} disabled={generating || !hasSeatNo}>
            <Download size={16} /> Download Receipt JPG
          </button>
          <button type="button" onClick={handleShareReceipt} disabled={generating || !hasSeatNo || !canShareWhatsApp}>
            <Share2 size={16} /> Share to WhatsApp
          </button>
          <button type="button" onClick={saveReceiptNumber} disabled={generating || !writeEnabled || !hasSeatNo || participant.receiptGenerated}>
            <Save size={16} /> {participant.receiptGenerated ? 'Receipt Saved' : 'Mark Receipt Generated'}
          </button>
        </div>
      ) : (
        <div className="receipt-unavailable">
          <AlertTriangle size={16} />
          <span>{!paymentReceiptEligible ? receiptUnavailableMessage(participant) : !validTimestampDate ? 'Registration timestamp missing' : 'Valid event-wise receipt number is required'}</span>
        </div>
      )}
      {paymentReceiptEligible && validTimestampDate && !validReceiptNumber ? (
        <div className="receipt-actions-row">
          <button type="button" onClick={saveReceiptNumber} disabled={generating || !writeEnabled || !hasSeatNo}>
            <Save size={16} /> Save Receipt No
          </button>
        </div>
      ) : null}
      {previewOpen ? (
        <div className="receipt-modal-backdrop" role="dialog" aria-modal="true" aria-label="Receipt preview">
          <div className="receipt-modal">
            <div className="receipt-modal-head">
              <div>
                <span>Receipt Preview</span>
                <strong>{receiptNo || activeReceiptNo || 'Receipt preview'}</strong>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close receipt preview">
                <X size={18} />
              </button>
            </div>
            {receiptDataUrl ? <img src={receiptDataUrl} alt="Completed receipt preview" /> : null}
            <div className="receipt-modal-actions">
              <button type="button" onClick={() => setPreviewOpen(false)}>Close</button>
              <button type="button" onClick={handleDownloadReceipt}><Download size={16} /> Download Receipt JPG</button>
              <button type="button" onClick={handleShareReceipt} disabled={!canShareWhatsApp}><Share2 size={16} /> Share to WhatsApp</button>
            </div>
          </div>
        </div>
      ) : null}
      {message ? <small>{message}</small> : null}
      {paymentReceiptEligible && !validReceiptNumber ? <small>Preview, download, refresh, close, and WhatsApp share do not reserve receipt number {suggestedReceiptNo}. Use Save Receipt No when ready.</small> : null}
      {paymentReceiptEligible && validReceiptNumber && !validTimestampDate ? <small>Registration timestamp missing</small> : null}
      {receiptReady && !canShareWhatsApp ? <small>WhatsApp share disabled: {mobileValidation.issue}</small> : null}
      {paymentReceiptEligible && !hasSeatNo ? <small>Seat No is required before receipt generation</small> : null}
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
      : isFreeSponsorship(participant)
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
        <p><span>Receipt No</span>{normalizeReceiptNumber(participant.receiptNo, participant.eventType) || 'Not generated'}</p>
      </div>

      <div className="detail-grid">
        <p><span>Address</span>{participant.address || 'Not entered'}</p>
        <p><span>Remarks</span>{participant.remarks || 'No remarks'}</p>
      </div>

      <AdminEditPanel participant={participant} rows={rows} writeEnabled={writeEnabled} onSave={onSave} />

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
        {!isFreeSponsorship(participant) ? (
          <>
            <a href={makeWhatsAppUrl(participant, 'confirmation')} onClick={() => handleWhatsAppOpen('confirmation')} target="_blank" rel="noreferrer">
              <BadgeCheck size={16} /> Payment
            </a>
            <a href={makeWhatsAppUrl(participant, 'balance')} onClick={() => handleWhatsAppOpen('balance')} target="_blank" rel="noreferrer">
              <IndianRupee size={16} /> Balance
            </a>
          </>
        ) : null}
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

function isConfirmedSponsor(sponsor) {
  const status = String(sponsor.status || '').toLowerCase();
  return status !== 'cancelled' && (
    ['confirmed', 'paid', 'received', 'fully received'].includes(status) ||
    Number(sponsor.confirmedQuantity || sponsor.sponsored2026 || 0) > 0
  );
}

function isReceivedSponsor(sponsor) {
  return ['received', 'fully received'].includes(String(sponsor.status || '').toLowerCase());
}

function sponsorDisplayName(sponsor) {
  return sponsor.sponsorName || sponsor.donorName || 'Unnamed sponsor';
}

function MangalyaSponsorCard({ sponsor, writeEnabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sponsorName: sponsorDisplayName(sponsor),
    contactNo: sponsor.contactNo || '',
    sponsored2025: String(sponsor.sponsored2025 || 0),
    sponsored2026: String(sponsor.sponsored2026 || 0),
    status: sponsor.status || 'Pending',
    remarks: sponsor.remarks || '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState('appeal');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [opened, setOpened] = useState(false);
  const [openedMessageType, setOpenedMessageType] = useState('appeal');
  const validation = mobileValidationStatus(sponsor.contactNo);
  const canOpenWhatsApp = validation.status === 'ok';

  useEffect(() => {
    setForm({
      sponsorName: sponsorDisplayName(sponsor),
      contactNo: sponsor.contactNo || '',
      sponsored2025: String(sponsor.sponsored2025 || 0),
      sponsored2026: String(sponsor.sponsored2026 || 0),
      status: sponsor.status || 'Pending',
      remarks: sponsor.remarks || '',
    });
    setMessage('');
    setOpened(false);
    setOpenedMessageType('appeal');
    setPreviewType('appeal');
  }, [sponsor]);

  async function saveSponsor(updates) {
    if (!writeEnabled || !sponsor.id) return;
    setSaving(true);
    setMessage('');
    try {
      const nextUpdates = { ...updates };
      if (
        Object.prototype.hasOwnProperty.call(nextUpdates, 'sponsored2026') &&
        Number(nextUpdates.sponsored2026 || 0) > 0 &&
        String(nextUpdates.status || sponsor.status || '').toLowerCase() === 'pending'
      ) {
        nextUpdates.status = 'Confirmed';
      }
      await onSave(sponsor.id, nextUpdates);
      setMessage('Saved to Google Sheet');
      setEditing(false);
    } catch (error) {
      setMessage(error.message || 'Unable to save sponsor');
    } finally {
      setSaving(false);
    }
  }

  function openWhatsApp(messageType = 'appeal') {
    if (!canOpenWhatsApp) return;
    const url = makeMangalyaDonorWhatsAppUrl(sponsor, messageType);
    const decodedMessage = decodeURIComponent(url.split('text=')[1] || '');
    console.debug('[MVST Mangalya sponsorship WhatsApp decoded message]', decodedMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpened(true);
    setOpenedMessageType(messageType);
    setMessage('');
  }

  function previewMessage(messageType) {
    setPreviewType(messageType);
    setPreviewOpen(true);
  }

  return (
    <article className="donor-card sponsorship-card">
      <div className="participant-top">
        <div>
          <p className="event-label">Sponsorship Management</p>
          <h3>{sponsorDisplayName(sponsor)}</h3>
          <p className="muted">{sponsor.contactNo || 'Mobile number missing'} - {validation.issue}</p>
        </div>
        <StatusPill tone={isReceivedSponsor(sponsor) ? 'success' : isConfirmedSponsor(sponsor) ? 'warning' : sponsor.status === 'Cancelled' ? 'danger' : 'neutral'}>
          {sponsor.status || 'Pending'}
        </StatusPill>
      </div>

      <div className="money-grid sponsorship-money-grid">
        <span><small>Previous Qty</small><b>{sponsor.sponsored2025 || 0}</b></span>
        <span><small>Confirmed Qty</small><b>{sponsor.confirmedQuantity || sponsor.sponsored2026 || 0}</b></span>
        <span><small>Amount</small><b>{formatCurrency(sponsor.amount || sponsorAmount(sponsor))}</b></span>
      </div>

      <div className="detail-grid donor-detail-grid">
        <p><span>Remarks</span>{sponsor.remarks || 'No remarks'}</p>
        <p>
          <span>Journey Status</span>
          {DONOR_JOURNEY_STEPS.map((step) => {
            const sent = donorJourneySent(sponsor, step.type);
            const date = donorJourneyDate(sponsor, step.type);
            return `${step.label}: ${sent ? 'Sent' : 'Pending'}${date ? ' - ' + date : ''}`;
          }).join(' | ')}
        </p>
      </div>

      {editing ? (
        <div className="admin-panel sponsorship-edit-panel">
          <label><span>Sponsor Name</span><input value={form.sponsorName} onChange={(event) => setForm({ ...form, sponsorName: event.target.value })} /></label>
          <label><span>Contact Number</span><input value={form.contactNo} onChange={(event) => setForm({ ...form, contactNo: event.target.value })} /></label>
          <label><span>Previous Qty</span><input min="0" type="number" value={form.sponsored2025} onChange={(event) => setForm({ ...form, sponsored2025: event.target.value })} /></label>
          <label><span>Confirmed Qty</span><input min="0" type="number" value={form.sponsored2026} onChange={(event) => setForm({ ...form, sponsored2026: event.target.value })} /></label>
          <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['Pending', 'Confirmed', 'Paid', 'Received', 'Cancelled'].map((statusValue) => <option key={statusValue}>{statusValue}</option>)}</select></label>
          <label className="remarks-field"><span>Remarks</span><textarea rows="2" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></label>
          <button className="save-button" type="button" onClick={() => saveSponsor(form)} disabled={!writeEnabled || saving}>{saving ? 'Saving' : 'Save'}</button>
          <button className="save-button secondary-action" type="button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : null}

      <div className="donor-journey">
        <p>Donor Journey</p>
        {DONOR_JOURNEY_STEPS.map((step) => (
          <span className={donorJourneySent(sponsor, step.type) ? 'journey-sent' : ''} key={step.type}>
            {step.title}
          </span>
        ))}
      </div>

      <div className="donor-actions">
        {DONOR_JOURNEY_STEPS.map((step) => (
          <button
            className={donorJourneySent(sponsor, step.type) ? 'journey-sent-button' : ''}
            disabled={!canOpenWhatsApp}
            key={step.type}
            onClick={() => openWhatsApp(step.type)}
            type="button"
          >
            {step.label}
          </button>
        ))}
        <button type="button" onClick={() => setEditing(!editing)}>Edit</button>
        <button type="button" onClick={() => saveSponsor({ status: 'Paid' })} disabled={!writeEnabled || saving}>Mark Paid</button>
        <button type="button" onClick={() => saveSponsor({ status: 'Received' })} disabled={!writeEnabled || saving}>Mark Received</button>
      </div>

      {opened ? (
        <div className="sent-action-panel">
          <span>{donorJourneyStep(openedMessageType).label} WhatsApp opened</span>
          <button type="button" onClick={() => saveSponsor(donorJourneySentUpdates(openedMessageType))} disabled={!writeEnabled || saving}>
            Mark {donorJourneyStep(openedMessageType).label} Sent
          </button>
        </div>
      ) : null}

      <div className="message-preview-actions">
        <button className="text-preview-button" type="button" onClick={() => previewMessage('appeal')}>Preview Appeal</button>
        <button className="text-preview-button" type="button" onClick={() => previewMessage('thank-you')}>Preview Confirmation</button>
        <button className="text-preview-button" type="button" onClick={() => previewMessage('payment-received')}>Preview Payment</button>
        <button className="text-preview-button" type="button" onClick={() => previewMessage('post-event-thank-you')}>Preview Post-Event</button>
      </div>
      {previewOpen ? (
        <pre className="donor-message-preview">
          {previewType === 'thank-you'
            ? buildMangalyaDonorThankYouMessage(sponsor)
            : previewType === 'payment-received'
              ? buildMangalyaDonorPaymentReceivedMessage(sponsor)
              : previewType === 'post-event-thank-you'
                ? buildMangalyaDonorPostEventThankYouMessage(sponsor)
                : buildMangalyaDonorAppealMessage(sponsor)}
        </pre>
      ) : null}
      {message ? <small className="donor-note">{message}</small> : null}
      {!writeEnabled ? <small className="donor-note">Read-only mode</small> : null}
    </article>
  );
}

const PREVIOUS_DONOR_FILTERS = [
  { id: 'all', label: 'All Previous Donors', test: () => true },
  { id: '10000', label: '₹10,000 Donors', test: (amount) => amount === 10000 },
  { id: '25000', label: '₹25,000 Donors', test: (amount) => amount === 25000 },
  { id: '50000', label: '₹50,000 Donors', test: (amount) => amount === 50000 },
  { id: '100000', label: '₹1,00,000+ Donors', test: (amount) => amount >= 100000 },
];

function PreviousDonorsCampaign({ donorState }) {
  const { donors, status, error, writeEnabled, isRefreshing, refresh, saveDonor } = donorState;
  const [filterId, setFilterId] = useState('all');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState('');
  const [mobileDraft, setMobileDraft] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueStarted, setQueueStarted] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueOpened, setQueueOpened] = useState(false);
  const previousDonors = useMemo(() => donors.filter(isPreviousDonor), [donors]);
  const missingMobileDonors = useMemo(() => previousDonors.filter((donor) => !donorMobileIsValid(donor)), [previousDonors]);

  const visibleDonors = useMemo(() => {
    const selected = PREVIOUS_DONOR_FILTERS.find((filter) => filter.id === filterId) || PREVIOUS_DONOR_FILTERS[0];
    const search = query.trim().toLowerCase();
    return previousDonors
      .filter((donor) => selected.test(previousDonationAmount(donor)))
      .filter((donor) => {
        if (!search) return true;
        return [sponsorDisplayName(donor), donor.contactNo, previousDonationAmount(donor), previousDonationYear(donor)]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });
  }, [filterId, previousDonors, query]);

  const readyDonors = useMemo(() => visibleDonors.filter(donorMobileIsValid), [visibleDonors]);
  const currentQueueDonor = queue[queueIndex];
  const hasNextQueueDonor = queueStarted && queueIndex < queue.length - 1;

  function startEdit(donor) {
    setEditingId(donor.id);
    setMobileDraft(donor.contactNo || '');
    setMessage('');
  }

  async function saveMobile(donor) {
    if (!writeEnabled || !donor?.id) return;
    setSaving(true);
    setMessage('');
    try {
      await saveDonor(donor.id, { contactNo: mobileDraft });
      setMessage('Mobile number saved to private Google Sheet');
      setEditingId('');
      setMobileDraft('');
    } catch (saveError) {
      setMessage(saveError.message || 'Unable to save mobile number');
    } finally {
      setSaving(false);
    }
  }

  function openDonorWhatsApp(donor) {
    if (!donorMobileIsValid(donor)) return;
    const url = makePreviousDonorWhatsAppUrl(donor);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function prepareQueue() {
    setQueue(readyDonors);
    setQueueStarted(false);
    setQueueIndex(0);
    setQueueOpened(false);
    setMessage(readyDonors.length ? 'Campaign preview ready. Open one WhatsApp message at a time.' : 'No WhatsApp-ready previous donors for this filter.');
  }

  function clearQueue() {
    setQueue([]);
    setQueueStarted(false);
    setQueueIndex(0);
    setQueueOpened(false);
    setMessage('');
  }

  function openQueueDonor(index) {
    const donor = queue[index];
    if (!donor) return;
    openDonorWhatsApp(donor);
    setQueueStarted(true);
    setQueueOpened(true);
    setMessage('');
  }

  function openCurrentQueueDonor() {
    if (!queue.length) return;
    openQueueDonor(queueIndex);
  }

  function openNextQueueDonor() {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) return;
    setQueueIndex(nextIndex);
    setQueueOpened(false);
    openQueueDonor(nextIndex);
  }

  async function copyAllMessages() {
    const text = readyDonors
      .map((donor, index) => [
        `${index + 1}. ${sponsorDisplayName(donor)}`,
        buildPreviousDonorAppealMessage(donor),
      ].join('\n'))
      .join('\n\n------------------------------\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`Copied ${readyDonors.length} personalized messages.`);
    } catch (copyError) {
      setMessage('Automatic copy is blocked. Use the preview text from each donor card.');
    }
  }

  return (
    <section className="management-section mangalya-donors-section previous-donors-section">
      <div className="section-heading">
        <div>
          <p>Previous Donors</p>
          <h2>WhatsApp campaign for donor outreach</h2>
        </div>
        <button className="refresh-button compact" type="button" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh Donors'}
        </button>
      </div>

      <div className="event-note">
        <b>{status}</b>
        <span>Previous-year history is used only for communication and is not included in 2026 financial reports.</span>
      </div>
      {error ? <div className="donor-warning">{error}</div> : null}

      <div className="stats-grid donor-stats-grid">
        <StatCard icon={UsersRound} label="Previous Donors" value={previousDonors.length} />
        <StatCard icon={MessageCircle} label="WhatsApp Ready" value={readyDonors.length} tone="success" />
        <StatCard icon={AlertTriangle} label="Missing Mobile" value={missingMobileDonors.length} tone="warning" />
        <StatCard icon={IndianRupee} label="Visible Amount" value={formatCurrency(visibleDonors.reduce((sum, donor) => sum + previousDonationAmount(donor), 0))} />
      </div>

      <div className="donor-filter-strip previous-donor-filter-strip">
        {PREVIOUS_DONOR_FILTERS.map((filter) => (
          <button className={filterId === filter.id ? 'active' : ''} type="button" key={filter.id} onClick={() => setFilterId(filter.id)}>
            {filter.label}
          </button>
        ))}
      </div>

      <div className="controls sponsorship-controls previous-donor-controls">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search donor, mobile, amount, year" />
        </label>
        <button className="refresh-button compact" type="button" onClick={prepareQueue}>
          <MessageCircle size={16} /> Preview Campaign Queue
        </button>
        <button className="refresh-button compact secondary-action" type="button" onClick={copyAllMessages} disabled={!readyDonors.length}>
          Copy All Messages
        </button>
      </div>

      {missingMobileDonors.length ? (
        <div className="confirmed-sponsors-panel">
          <div>
            <p>Missing Mobile Numbers</p>
            <strong>{missingMobileDonors.length} donors need contact updates</strong>
          </div>
          <div className="confirmed-sponsors-list">
            {missingMobileDonors.map((donor) => (
              <span key={donor.id}>{sponsorDisplayName(donor)} - {formatCurrency(previousDonationAmount(donor))}</span>
            ))}
          </div>
        </div>
      ) : null}

      {queue.length || queueStarted ? (
        <div className="bulk-whatsapp-panel donor-bulk-panel">
          <div className="bulk-preview">
            <div className="bulk-preview-head">
              <div>
                <p>Previous Donors WhatsApp Queue</p>
                <h3>Total count: {queue.length}</h3>
              </div>
              <button type="button" onClick={clearQueue}>Close</button>
            </div>
            {queue.length ? (
              <>
                <div className="bulk-preview-list donor-bulk-list">
                  {queue.map((donor, index) => (
                    <button className={index === queueIndex ? 'active' : ''} key={donor.id} onClick={() => { setQueueIndex(index); setQueueOpened(false); }} type="button">
                      <strong>{sponsorDisplayName(donor)}</strong>
                      <span>{formatCurrency(previousDonationAmount(donor))}</span>
                      <span>{donor.contactNo}</span>
                      <span>Ready</span>
                    </button>
                  ))}
                </div>
                {currentQueueDonor ? (
                  <div className="donor-current-preview">
                    <div><p>Current Message Preview</p><strong>{sponsorDisplayName(currentQueueDonor)} - {formatCurrency(previousDonationAmount(currentQueueDonor))}</strong></div>
                    <textarea readOnly rows="10" value={buildPreviousDonorAppealMessage(currentQueueDonor)} />
                  </div>
                ) : null}
                <div className="bulk-queue-controls">
                  <span>{queueOpened ? 'Opened' : 'Ready'} {queueIndex + 1} of {queue.length}: {sponsorDisplayName(currentQueueDonor || {})}</span>
                  <button type="button" onClick={openCurrentQueueDonor}>{queueOpened ? 'Reopen WhatsApp' : 'Open WhatsApp'}</button>
                  <button type="button" onClick={openNextQueueDonor} disabled={!hasNextQueueDonor}>Next Message</button>
                </div>
              </>
            ) : <p className="bulk-empty">No eligible previous donors found for this filter.</p>}
          </div>
        </div>
      ) : null}

      <div className="participants-list donor-list">
        {visibleDonors.length ? visibleDonors.map((donor) => {
          const validation = mobileValidationStatus(donor.contactNo);
          const isEditing = editingId === donor.id;
          return (
            <article className="donor-card sponsorship-card previous-donor-card" key={donor.id}>
              <div className="participant-top">
                <div>
                  <p className="event-label">Previous Donor Campaign</p>
                  <h3>{sponsorDisplayName(donor)}</h3>
                  <p className="muted">{donor.contactNo || 'Mobile number missing'} - {validation.issue}</p>
                </div>
                <StatusPill tone={validation.status === 'ok' ? 'success' : 'warning'}>
                  {validation.status === 'ok' ? 'WhatsApp Ready' : 'Missing Mobile'}
                </StatusPill>
              </div>

              <div className="money-grid sponsorship-money-grid">
                <span><small>Previous Donation</small><b>{formatCurrency(previousDonationAmount(donor))}</b></span>
                <span><small>Year</small><b>{previousDonationYear(donor) || 'History'}</b></span>
                <span><small>Mobile</small><b>{validation.status === 'ok' ? 'Ready' : 'Update Needed'}</b></span>
              </div>

              {isEditing ? (
                <div className="donor-mobile-edit">
                  <label><span>Contact Number</span><input value={mobileDraft} onChange={(event) => setMobileDraft(event.target.value)} /></label>
                  <button type="button" onClick={() => saveMobile(donor)} disabled={!writeEnabled || saving}>{saving ? 'Saving' : 'Save Mobile'}</button>
                </div>
              ) : null}

              <pre className="donor-message-preview">{buildPreviousDonorAppealMessage(donor)}</pre>

              <div className="donor-actions">
                <button type="button" onClick={() => openDonorWhatsApp(donor)} disabled={validation.status !== 'ok'}>Open WhatsApp</button>
                <button type="button" onClick={() => startEdit(donor)}>Edit Mobile</button>
              </div>
            </article>
          );
        }) : (
          <div className="empty-state"><Gift size={28} /><p>No previous donors found for this filter.</p></div>
        )}
      </div>

      {message ? <small className="donor-note">{message}</small> : null}
      {!writeEnabled ? <small className="donor-note">Read-only mode</small> : null}
    </section>
  );
}

function MangalyaDonorsSection({ donorState, requirementState, requiredBottus = 0 }) {
  const { donors, status, error, writeEnabled, isRefreshing, refresh, saveDonor } = donorState;
  const requirements = requirementState?.requirements || [];
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkStarted, setBulkStarted] = useState(false);
  const [bulkIndex, setBulkIndex] = useState(0);
  const [bulkMessage, setBulkMessage] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkOpened, setBulkOpened] = useState(false);
  const [sponsorFilter, setSponsorFilter] = useState('all');
  const [sponsorQuery, setSponsorQuery] = useState('');
  const [quantityFilter, setQuantityFilter] = useState('All');
  const activeDonors = useMemo(() => donors.filter((sponsor) => isActiveEventYear(sponsor.eventYear)), [donors]);
  const activeRequirements = useMemo(() => requirements.filter((row) => isActiveEventYear(row.eventYear)), [requirements]);

  const summary = useMemo(() => {
    const confirmedSponsors = activeDonors.filter(isConfirmedSponsor);
    const receivedSponsors = activeDonors.filter(isReceivedSponsor);
    const confirmedBottus = confirmedSponsors.reduce((sum, sponsor) => sum + Number(sponsor.confirmedQuantity || sponsor.sponsored2026 || 0), 0);
    const receivedBottus = receivedSponsors.reduce((sum, sponsor) => sum + Number(sponsor.receivedQuantity || sponsor.sponsored2026 || 0), 0);
    const confirmedAmount = confirmedSponsors.reduce((sum, sponsor) => sum + sponsorAmount(sponsor), 0);
    const receivedAmount = receivedSponsors.reduce((sum, sponsor) => sum + Number(sponsor.receivedAmount || sponsorAmount(sponsor) || 0), 0);
    const requirementQuantity = activeRequirements.reduce((sum, row) => sum + Number(row.requiredQuantity || 0), 0);
    return {
      totalSponsors: activeDonors.length,
      sponsorsConfirmed: confirmedSponsors.length,
      sponsorsPending: activeDonors.filter((sponsor) => String(sponsor.status || '').toLowerCase() === 'pending').length,
      newSponsors: activeDonors.filter((sponsor) => Number(sponsor.sponsored2025 || 0) === 0).length,
      sponsored2025: activeDonors.reduce((sum, sponsor) => sum + Number(sponsor.sponsored2025 || 0), 0),
      confirmed2026: confirmedBottus,
      remainingRequirement: Math.max(Number(requirementQuantity || requiredBottus || 0) - confirmedBottus, 0),
      expectedCollection: activeDonors.reduce((sum, sponsor) => sum + Number(sponsor.estimatedValue || 0), 0),
      confirmedCollection: confirmedAmount,
      receivedCollection: receivedAmount,
      balanceCollection: Math.max(confirmedAmount - receivedAmount, 0),
      averageBottus: confirmedSponsors.length ? confirmedBottus / confirmedSponsors.length : 0,
      topSponsors: [...confirmedSponsors]
        .sort((a, b) => Number(b.confirmedQuantity || b.sponsored2026 || 0) - Number(a.confirmedQuantity || a.sponsored2026 || 0))
        .slice(0, 4),
    };
  }, [activeDonors, activeRequirements, requiredBottus]);

  const requirementTotals = useMemo(() => activeRequirements.reduce((totals, row) => ({
    requiredQuantity: totals.requiredQuantity + Number(row.requiredQuantity || 0),
    confirmedQuantity: totals.confirmedQuantity + Number(row.confirmedQuantity || 0),
    receivedQuantity: totals.receivedQuantity + Number(row.receivedQuantity || 0),
    remainingQuantity: totals.remainingQuantity + Number(row.remainingQuantity || 0),
    estimatedTotalCost: totals.estimatedTotalCost + Number(row.estimatedTotalCost || 0),
    confirmedAmount: totals.confirmedAmount + Number(row.confirmedAmount || 0),
    receivedAmount: totals.receivedAmount + Number(row.receivedAmount || 0),
    remainingAmount: totals.remainingAmount + Number(row.remainingAmount || 0),
  }), {
    requiredQuantity: 0,
    confirmedQuantity: 0,
    receivedQuantity: 0,
    remainingQuantity: 0,
    estimatedTotalCost: 0,
    confirmedAmount: 0,
    receivedAmount: 0,
    remainingAmount: 0,
  }), [activeRequirements]);

  const financialTotals = useMemo(() => activeDonors.reduce((totals, sponsor) => {
    const received = Number(sponsor.receivedAmount || 0);
    const estimated = Number(sponsor.estimatedValue || 0);
    const nature = String(sponsor.contributionNature || '').toLowerCase();
    const mode = String(sponsor.paymentMode || sponsor.bankOrCash || '').toLowerCase();
    if (nature.includes('material') || nature.includes('kind')) totals.inKindEstimatedValue += estimated;
    if (nature.includes('service')) totals.serviceEstimatedValue += estimated;
    if (mode.includes('cash')) totals.cashReceived += received;
    else if (mode.includes('upi')) totals.upiReceived += received;
    else if (mode.includes('cheque') || mode.includes('check')) totals.chequeReceived += received;
    else if (mode.includes('bank')) totals.bankReceived += received;
    totals.totalMonetaryReceived += received;
    totals.totalSponsorshipValue += received + (nature.includes('material') || nature.includes('service') ? estimated : 0);
    return totals;
  }, {
    cashReceived: 0,
    bankReceived: 0,
    upiReceived: 0,
    chequeReceived: 0,
    inKindEstimatedValue: 0,
    serviceEstimatedValue: 0,
    totalMonetaryReceived: 0,
    totalSponsorshipValue: 0,
  }), [activeDonors]);

  const currentBulkDonor = bulkQueue[bulkIndex];
  const hasNextBulkDonor = bulkStarted && bulkIndex < bulkQueue.length - 1;
  const visibleDonors = useMemo(() => {
    const search = sponsorQuery.trim().toLowerCase();
    return activeDonors
      .filter((sponsor) => {
        if (sponsorFilter === 'missing-mobile') return !String(sponsor.contactNo || '').trim();
        if (sponsorFilter === 'whatsapp-pending') return !donorJourneySent(sponsor, 'appeal');
        if (sponsorFilter === 'whatsapp-sent') return donorJourneySent(sponsor, 'appeal');
        if (sponsorFilter === 'confirmed-quantity') return isConfirmedSponsor(sponsor);
        if (sponsorFilter !== 'all') return String(sponsor.status || '').toLowerCase() === sponsorFilter;
        return true;
      })
      .filter((sponsor) => {
        if (quantityFilter === 'All') return true;
        if (quantityFilter === '3+') return Number(sponsor.sponsored2026 || 0) >= 3;
        return Number(sponsor.sponsored2026 || 0) === Number(quantityFilter);
      })
      .filter((sponsor) => {
        if (!search) return true;
        return [sponsorDisplayName(sponsor), sponsor.contactNo, sponsor.status, sponsor.sponsored2025, sponsor.sponsored2026]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });
  }, [activeDonors, sponsorFilter, sponsorQuery, quantityFilter]);

  function prepareBulkQueue() {
    setBulkQueue(activeDonors.filter((donor) => donorMobileIsValid(donor) && !donorJourneySent(donor, 'appeal')));
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
    console.debug('[MVST Mangalya sponsorship WhatsApp decoded message]', buildMangalyaDonorAppealMessage(donor));
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
    setSavingBulk(true);
    setBulkMessage('');
    try {
      await saveDonor(currentBulkDonor.id, donorJourneySentUpdates('appeal'));
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
          <p>Sponsorship Management</p>
          <h2>Requirement and donor contribution tracking</h2>
        </div>
        <button className="refresh-button compact" type="button" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh Sponsorship'}
        </button>
      </div>

      <div className="event-note">
        <b>{status}</b>
        <span>{writeEnabled ? 'Private Google Sheet connected' : 'Read-only mode'}</span>
      </div>
      {error ? <div className="donor-warning">{error}</div> : null}

      <div className="requirement-progress-panel">
        <div className="requirement-panel-head">
          <div>
            <p>Requirement Progress Dashboard</p>
            <h3>Annual sponsorship requirements from master data</h3>
            {requirementState?.status ? <span>{requirementState.status}</span> : null}
          </div>
          <button className="refresh-button compact" type="button" onClick={requirementState?.refresh} disabled={requirementState?.isRefreshing}>
            <RefreshCw size={16} className={requirementState?.isRefreshing ? 'spin' : ''} />
            {requirementState?.isRefreshing ? 'Refreshing' : 'Refresh Requirements'}
          </button>
        </div>
        {requirementState?.error ? <div className="donor-warning">{requirementState.error}</div> : null}
        {activeRequirements.length ? (
          <>
            <div className="requirement-total-grid">
              <span><small>Required</small><b>{requirementTotals.requiredQuantity}</b></span>
              <span><small>Confirmed</small><b>{requirementTotals.confirmedQuantity}</b></span>
              <span><small>Received</small><b>{requirementTotals.receivedQuantity}</b></span>
              <span><small>Remaining</small><b>{requirementTotals.remainingQuantity}</b></span>
              <span><small>Estimated Cost</small><b>{formatCurrency(requirementTotals.estimatedTotalCost)}</b></span>
              <span><small>Confirmed Amount</small><b>{formatCurrency(requirementTotals.confirmedAmount)}</b></span>
              <span><small>Received Amount</small><b>{formatCurrency(requirementTotals.receivedAmount)}</b></span>
              <span><small>Balance</small><b>{formatCurrency(requirementTotals.remainingAmount)}</b></span>
            </div>
            <div className="requirement-table">
              <div>
                <strong>Category</strong><strong>Required</strong><strong>Confirmed</strong><strong>Received</strong><strong>Remaining</strong><strong>Received Amount</strong>
              </div>
              {activeRequirements.map((row) => (
                <div key={row.id}>
                  <span>{row.canonicalCategory || row.category}</span>
                  <span>{row.requiredQuantity} {row.unit}</span>
                  <span>{row.confirmedQuantity}</span>
                  <span>{row.receivedQuantity}</span>
                  <span>{row.remainingQuantity}</span>
                  <span>{formatCurrency(row.receivedAmount)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state compact-empty">
            <Gift size={24} />
            <p>Add a private Google Sheet tab named Sponsorship Requirements to enable annual category progress.</p>
          </div>
        )}
      </div>

      <div className="financial-report-heading">
        <p>Financial Report</p>
        <h3>Collections and estimated non-cash sponsorship value</h3>
        <span>Dashboard totals default to Event Year {ACTIVE_EVENT_YEAR}. Previous-year history is used only for donor communication.</span>
      </div>
      <div className="sponsorship-stat-panel financial-report-panel">
        <div><span>Cash Received</span><strong>{formatCurrency(financialTotals.cashReceived)}</strong></div>
        <div><span>Bank Received</span><strong>{formatCurrency(financialTotals.bankReceived)}</strong></div>
        <div><span>UPI Received</span><strong>{formatCurrency(financialTotals.upiReceived)}</strong></div>
        <div><span>Cheque Received</span><strong>{formatCurrency(financialTotals.chequeReceived)}</strong></div>
        <div><span>In-Kind Estimated Value</span><strong>{formatCurrency(financialTotals.inKindEstimatedValue)}</strong></div>
        <div><span>Service Estimated Value</span><strong>{formatCurrency(financialTotals.serviceEstimatedValue)}</strong></div>
        <div><span>Total Monetary Received</span><strong>{formatCurrency(financialTotals.totalMonetaryReceived)}</strong></div>
        <div><span>Total Sponsorship Value</span><strong>{formatCurrency(financialTotals.totalSponsorshipValue)}</strong></div>
      </div>

      <div className="sponsorship-summary-block">
        <div>
          <p className="event-label">Sponsors</p>
          <div className="stats-grid donor-stats-grid">
            <StatCard icon={UsersRound} label="Total Sponsors" value={summary.totalSponsors} onClick={() => setSponsorFilter('all')} />
            <StatCard icon={CheckCircle2} label="Sponsors Confirmed" value={summary.sponsorsConfirmed} tone="success" onClick={() => setSponsorFilter('confirmed-quantity')} />
            <StatCard icon={AlertTriangle} label="Sponsors Pending" value={summary.sponsorsPending} tone="warning" onClick={() => setSponsorFilter('pending')} />
            <StatCard icon={Sparkles} label="New Sponsors" value={summary.newSponsors} />
          </div>
        </div>
        <div>
          <p className="event-label">Requirement Quantity</p>
          <div className="stats-grid donor-stats-grid">
            <StatCard icon={Gift} label="Previous Qty" value={summary.sponsored2025} />
            <StatCard icon={Gift} label="Confirmed Qty" value={summary.confirmed2026} tone="success" onClick={() => setSponsorFilter('confirmed-quantity')} />
            <StatCard icon={Gift} label="Remaining Requirement" value={summary.remainingRequirement} tone="warning" />
          </div>
        </div>
        <div>
          <p className="event-label">Collection</p>
          <div className="stats-grid donor-stats-grid">
            <StatCard icon={IndianRupee} label="Expected Collection" value={formatCurrency(summary.expectedCollection)} />
            <StatCard icon={IndianRupee} label="Confirmed Collection" value={formatCurrency(summary.confirmedCollection)} tone="success" />
            <StatCard icon={IndianRupee} label="Received Collection" value={formatCurrency(summary.receivedCollection)} tone="success" />
            <StatCard icon={IndianRupee} label="Balance Collection" value={formatCurrency(summary.balanceCollection)} tone="warning" />
          </div>
        </div>
        <div className="sponsorship-stat-panel">
          <div><span>Total Quantity Confirmed</span><strong>{summary.confirmed2026}</strong></div>
          <div><span>Total Amount Confirmed</span><strong>{formatCurrency(summary.confirmedCollection)}</strong></div>
          <div><span>Average Quantity per Sponsor</span><strong>{summary.averageBottus.toFixed(1)}</strong></div>
          <div className="top-sponsors"><span>Top Sponsors</span><strong>{summary.topSponsors.map((sponsor) => `${sponsorDisplayName(sponsor)} (${sponsor.confirmedQuantity || sponsor.sponsored2026 || 0})`).join(', ') || 'None'}</strong></div>
        </div>
      </div>

      <div className="controls sponsorship-controls">
        <label className="search-field">
          <Search size={17} />
          <input value={sponsorQuery} onChange={(event) => setSponsorQuery(event.target.value)} placeholder="Search sponsor, mobile, status, quantity" />
        </label>
        <SelectField icon={Filter} label="Status" value={sponsorFilter} onChange={setSponsorFilter}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="confirmed-quantity">Confirmed Quantity</option>
          <option value="paid">Paid</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
          <option value="missing-mobile">Missing Mobile</option>
          <option value="whatsapp-pending">WhatsApp Pending</option>
          <option value="whatsapp-sent">WhatsApp Sent</option>
        </SelectField>
        <SelectField label="Quantity" value={quantityFilter} onChange={setQuantityFilter}>
          <option>All</option>
          <option>0</option>
          <option>1</option>
          <option>2</option>
          <option>3+</option>
        </SelectField>
      </div>

      {sponsorFilter === 'confirmed-quantity' ? (
        <div className="confirmed-sponsors-panel">
          <div>
            <p>Confirmed Sponsors</p>
            <strong>{visibleDonors.length} sponsors / {summary.confirmed2026} confirmed quantity</strong>
          </div>
          <div className="confirmed-sponsors-list">
            {visibleDonors.map((sponsor) => (
              <span key={sponsor.id}>{sponsorDisplayName(sponsor)} - {sponsor.confirmedQuantity || sponsor.sponsored2026 || 0} {sponsor.unit || 'qty'}</span>
            ))}
          </div>
        </div>
      ) : null}

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
                <p>Sponsorship WhatsApp Queue</p>
                <h3>Total count: {bulkQueue.length}</h3>
              </div>
              <button type="button" onClick={clearBulkQueue}>Close</button>
            </div>
            {bulkQueue.length ? (
              <>
                <div className="bulk-preview-list donor-bulk-list">
                  {bulkQueue.map((donor, index) => (
                    <button className={index === bulkIndex ? 'active' : ''} key={donor.id} onClick={() => { setBulkIndex(index); setBulkOpened(false); setBulkMessage(''); }} type="button">
                      <strong>{sponsorDisplayName(donor)}</strong>
                      <span>{donor.contactNo}</span>
                      <span>{donor.sponsored2025} previous qty</span>
                      <span>{donor.status}</span>
                    </button>
                  ))}
                </div>
                {currentBulkDonor ? (
                  <div className="donor-current-preview">
                    <div><p>Current Message Preview</p><strong>{sponsorDisplayName(currentBulkDonor)} - {currentBulkDonor.contactNo}</strong></div>
                    <textarea readOnly rows="10" value={buildMangalyaDonorAppealMessage(currentBulkDonor)} />
                  </div>
                ) : null}
                <div className="bulk-queue-controls">
                  <span>{bulkOpened ? 'Opened' : 'Ready'} {bulkIndex + 1} of {bulkQueue.length}: {sponsorDisplayName(currentBulkDonor || {})}</span>
                  <button type="button" onClick={openCurrentBulkDonor}>{bulkOpened ? 'Reopen WhatsApp' : 'Open WhatsApp'}</button>
                  <button type="button" onClick={markBulkDonorAsSent} disabled={!writeEnabled || savingBulk || !bulkOpened}>{savingBulk ? 'Saving' : 'Mark WhatsApp Sent'}</button>
                  <button type="button" onClick={openNextBulkDonor} disabled={!hasNextBulkDonor}>Next WhatsApp</button>
                  {bulkMessage ? <small>{bulkMessage}</small> : null}
                </div>
              </>
            ) : <p className="bulk-empty">No eligible sponsors found. Missing mobile numbers and already-sent sponsors are skipped.</p>}
          </div>
        ) : null}
      </div>

      <div className="participants-list donor-list">
        {visibleDonors.length ? visibleDonors.map((sponsor) => (
          <MangalyaSponsorCard key={sponsor.id} sponsor={sponsor} writeEnabled={writeEnabled} onSave={saveDonor} />
        )) : (
          <div className="empty-state"><Gift size={28} /><p>No Mangalya sponsors found for this filter.</p></div>
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

function WhatsAppGroupSetup({ rows, groupConfig }) {
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  const groupPreviews = useMemo(
    () => ['shashtipoorthi', 'bhimaratha'].map((eventType) => buildWhatsAppGroupPreview(rows, eventType, groupConfig.pstAdmins)),
    [rows, groupConfig.pstAdmins],
  );

  function openPreview(eventType) {
    setPreview(buildWhatsAppGroupPreview(rows, eventType, groupConfig.pstAdmins));
    setMessage('');
  }

  function downloadContactsForPreview() {
    if (!preview || !canProceed) return;
    const contacts = buildGroupContactRows(preview);
    downloadTextFile(groupContactFileName(preview), buildContactsVcf(contacts), 'text/vcard;charset=utf-8');
    setMessage(`Downloaded ${contacts.length} new contacts after Seat No. ${preview.handledSeatBaseline}. Import the VCF, wait for WhatsApp sync, then add them to the existing group.`);
  }

  function downloadBothGroupContacts() {
    const contacts = buildCombinedGroupContactRows(groupPreviews);
    if (!contacts.length) {
      setMessage('No valid contacts are available for download.');
      return;
    }
    downloadTextFile('mvst-new-whatsapp-contacts-after-' + WHATSAPP_GROUP_HANDLED_SEAT_BASELINE.toLowerCase() + '.vcf', buildContactsVcf(contacts), 'text/vcard;charset=utf-8');
    setMessage(`Downloaded ${contacts.length} new contacts for both groups after Seat No. ${WHATSAPP_GROUP_HANDLED_SEAT_BASELINE}.`);
  }

  async function copyParticipantNames() {
    if (!preview || !canProceed) return;
    const clipboardText = buildGroupClipboardText(preview);
    setMessage('');
    try {
      await navigator.clipboard.writeText(clipboardText);
      setMessage('Contact names copied. Use these names while searching in WhatsApp.');
    } catch (error) {
      setMessage('Automatic copy is blocked. Use the downloaded VCF and on-screen prefixes.');
    }
  }

  async function copyMobileNumbers() {
    if (!preview || !canProceed) return;
    const clipboardText = buildGroupMobileNumbersText(preview);
    setMessage('');
    try {
      await navigator.clipboard.writeText(clipboardText);
      setMessage('New mobile numbers copied in +91 format.');
    } catch (error) {
      setMessage('Automatic copy is blocked. Download the VCF instead.');
    }
  }

  function openWhatsAppWeb() {
    setMessage('WhatsApp Web opened. On mobile, open the WhatsApp app manually if WhatsApp Web shows the desktop-only screen.');
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
  }

  const canProceed = preview && preview.validParticipants.length > 0;

  return (
    <section className="whatsapp-group-section">
      <div className="section-heading">
        <div>
          <p>WhatsApp Groups</p>
          <h2>Assisted group creation</h2>
        </div>
      </div>

      <div className="whatsapp-group-note">
        <b>Current groups are already created. Existing participants up to Seat No. {WHATSAPP_GROUP_HANDLED_SEAT_BASELINE} are treated as handled.</b>
        <span>Use this section only for future registrations after Seat No. {WHATSAPP_GROUP_HANDLED_SEAT_BASELINE}. No WhatsApp-added status is written back to Google Sheets.</span>
        {groupConfig.error ? <small>{groupConfig.error}</small> : null}
      </div>

      <div className="group-action-grid">
        <button type="button" onClick={() => openPreview('shashtipoorthi')}>
          <UsersRound size={18} />
          Prepare Shastipoorthi Group
        </button>
        <button type="button" onClick={() => openPreview('bhimaratha')}>
          <UsersRound size={18} />
          Prepare Bheemaratha Group
        </button>
        <button type="button" onClick={downloadBothGroupContacts} disabled={groupPreviews.every((item) => !buildGroupContactRows(item).length)}>
          <Download size={18} />
          Download Both Groups' New Contacts
        </button>
      </div>

      {preview ? (
        <div className="group-preview-card">
          <div className="group-preview-head">
            <div>
              <p>Confirmation Preview</p>
              <h3>{preview.groupName}</h3>
            </div>
            <button type="button" onClick={() => setPreview(null)}>Close</button>
          </div>

          <div className="group-preview-grid">
            <div><span>Event</span><strong>{preview.eventLabel}</strong></div>
            <div><span>Total participants</span><strong>{preview.totalParticipants}</strong></div>
            <div><span>Handled through seat</span><strong>{preview.handledSeatBaseline}</strong></div>
            <div><span>Future registrations</span><strong>{preview.futureRegistrations}</strong></div>
            <div><span>New valid contacts</span><strong>{preview.validParticipants.length}</strong></div>
            <div><span>New missing-mobile participants</span><strong>{preview.missingMobileParticipants.length}</strong></div>
            <div><span>Duplicate entries skipped</span><strong>{preview.duplicateCount}</strong></div>
          </div>

          <div className="group-preview-lists">
            <div>
              <h4>Future / New Participants</h4>
              {preview.validParticipants.length ? (
                preview.validParticipants.map((participant, index) => (
                  <span key={`${participant.name}-${index}`}>{participant.seatNo || 'Seat pending'} - {contactDisplayName(WHATSAPP_CONTACT_PREFIXES[preview.eventType], participant.name)}</span>
                ))
              ) : (
                <span>No new participants after Seat No. {preview.handledSeatBaseline}.</span>
              )}
            </div>
            <div>
              <h4>New missing / invalid mobiles</h4>
              {preview.missingMobileParticipants.length ? (
                preview.missingMobileParticipants.map((participant, index) => (
                  <span key={`${participant.name}-${index}`}>{participant.seatNo || 'Seat pending'} - {participant.name} - {participant.issue}</span>
                ))
              ) : (
                <span>No missing or invalid mobile numbers among new participants.</span>
              )}
            </div>
          </div>

          <div className="group-manual-steps">
            <h4>Future registration steps</h4>
            <ol>
              <li>Download the new-participant VCF contact file.</li>
              <li>Open or import it into Google Contacts, Windows contacts, or phone contacts.</li>
              <li>Wait briefly for WhatsApp contacts to sync.</li>
              <li>Open the existing WhatsApp group.</li>
              <li>Search using {WHATSAPP_CONTACT_PREFIXES[preview.eventType]}.</li>
              <li>Add only the new contacts shown in this section.</li>
            </ol>
          </div>

          <div className="group-controls">
            <button type="button" onClick={downloadContactsForPreview} disabled={!canProceed}>
              <Download size={16} />
              Download New Contacts (.vcf)
            </button>
            <button type="button" onClick={copyParticipantNames} disabled={!canProceed}>
              Copy New Participant Names
            </button>
            <button type="button" onClick={copyMobileNumbers} disabled={!canProceed}>
              Copy New Mobile Numbers
            </button>
            <button type="button" onClick={openWhatsAppWeb} disabled={!canProceed}>
              Open WhatsApp Web
            </button>
          </div>
          {!canProceed ? <small className="group-warning">No valid new participant contacts found after Seat No. {preview.handledSeatBaseline}.</small> : null}
          {message ? <small className="group-message">{message}</small> : null}
        </div>
      ) : null}
    </section>
  );
}

function SeatGuidanceSection({ rows }) {
  const audits = ['shashtipoorthi', 'bhimaratha'].map((eventType) => ({
    eventType,
    eventLabel: EVENTS[eventType].shortLabel,
    audit: seatAuditForEvent(rows, eventType),
  }));

  return (
    <section className="seat-guidance-section">
      <div className="section-heading">
        <div>
          <p>Seat Guidance</p>
          <h2>Last accepted seat and next-seat suggestion</h2>
        </div>
      </div>
      <div className="seat-guidance-grid">
        {audits.map(({ eventType, eventLabel, audit }) => (
          <article className="seat-guidance-card" key={eventType}>
            <div className="seat-guidance-head">
              <p>{eventLabel}</p>
              <strong>Suggested Next Seat: {audit.suggestedNextSeat}</strong>
            </div>
            <div className="receipt-meta-grid">
              <p><span>Last Accepted Seat</span>{audit.lastAcceptedSeat}</p>
              <p><span>Current Row</span>{audit.currentRow}</p>
              <p><span>Occupied in Current Row</span>{audit.occupiedInCurrentRow} of 6</p>
              <p><span>Missing Seat Number</span>{audit.missingSeats.length}</p>
              <p><span>Invalid Seat Format</span>{audit.invalidSeats.length}</p>
              <p><span>Duplicate Seat Numbers</span>{audit.duplicateSeats.length}</p>
            </div>
            {audit.duplicateSeats.length || audit.invalidSeats.length || audit.missingSeats.length ? (
              <div className="seat-warning-list">
                {audit.duplicateSeats.map(([seat, count]) => <span key={seat}>Duplicate: {seat} appears {count} times</span>)}
                {audit.invalidSeats.slice(0, 5).map((row) => <span key={`invalid-${row.id}`}>Invalid: {row.seatNo || 'Blank'} - {participantDisplayName(row)}</span>)}
                {audit.missingSeats.slice(0, 5).map((row) => <span key={`missing-${row.id}`}>Missing: {participantDisplayName(row)}</span>)}
              </div>
            ) : <small>No seat warnings for this event.</small>}
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  const { rows, status, error, isLive, isRefreshing, dataSource, writeEnabled, saveRegistration, refresh } = useParticipants();
  const donorState = useMangalyaDonors();
  const requirementState = useSponsorshipRequirements();
  const groupConfig = useWhatsAppGroupConfig();
  const [activeView, setActiveView] = useState('home');
  const [activeEvent, setActiveEvent] = useState('shashtipoorthi');
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [verifiedFilter, setVerifiedFilter] = useState('All');
  const [kitFilter, setKitFilter] = useState('All');
  const [participantSort, setParticipantSort] = useState('latest');
  const [bulkQueue, setBulkQueue] = useState([]);
  const [bulkQueueType, setBulkQueueType] = useState('');
  const [bulkQueueStarted, setBulkQueueStarted] = useState(false);
  const [bulkQueueIndex, setBulkQueueIndex] = useState(0);
  const [bulkSentMessage, setBulkSentMessage] = useState('');
  const [markingBulkSent, setMarkingBulkSent] = useState(false);
  const [bulkReceiptGenerating, setBulkReceiptGenerating] = useState(false);
  const [bulkReceiptMessage, setBulkReceiptMessage] = useState('');

  const summary = useMemo(() => {
    const expected = rows.reduce((sum, row) => sum + (isFreeSponsorship(row) ? 0 : row.contribution), 0);
    const received = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    return {
      total: rows.length,
      shashtipoorthi: rows.filter((row) => row.eventType === 'shashtipoorthi').length,
      bhimaratha: rows.filter((row) => row.eventType === 'bhimaratha').length,
      fullPaid: rows.filter((row) => row.paymentStatus === 'Full Paid').length,
      partPaid: rows.filter((row) => row.paymentStatus === 'Part Paid').length,
      freeSponsorship: rows.filter((row) => isFreeSponsorship(row)).length,
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
      balance: rows.reduce((sum, row) => sum + row.balance, 0),
    };
  }, [rows]);

  const mobileValidationRows = useMemo(() => buildMobileValidationRows(rows), [rows]);
  const mobileIssueRows = useMemo(
    () => mobileValidationRows.filter((row) => row.hasIssue),
    [mobileValidationRows],
  );

  const newRegistrationRows = useMemo(
    () => sortParticipants(rows.filter((row) => !row.treasurerVerified), 'latest'),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = rows
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
    return sortParticipants(filtered, participantSort);
  }, [rows, activeEvent, query, paymentFilter, verifiedFilter, kitFilter, participantSort]);

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
    setActiveView('home');
    requestAnimationFrame(() => scrollToSection('new-registrations-dashboard'));
  }

  function goToPaymentPending() {
    setPaymentFilter('Pending');
    setVerifiedFilter('All');
    setKitFilter('All');
    setActiveView(activeEvent);
    requestAnimationFrame(() => scrollToSection('participant-management-dashboard'));
  }

  function goToFreeSponsorship() {
    setPaymentFilter('Free Sponsorship');
    setVerifiedFilter('All');
    setKitFilter('All');
    setActiveView(activeEvent);
    requestAnimationFrame(() => scrollToSection('participant-management-dashboard'));
  }

  function goToParticipantManagement() {
    setPaymentFilter('All');
    setVerifiedFilter('All');
    setKitFilter('All');
    setActiveView(activeEvent);
    requestAnimationFrame(() => scrollToSection('participant-management-dashboard'));
  }

  function openEventView(eventType) {
    setActiveEvent(eventType);
    setActiveView(eventType);
    setPaymentFilter('All');
    setVerifiedFilter('All');
    setKitFilter('All');
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
        const receiptNo = suggestedReceiptNumber(workingRows, currentParticipant);
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

      <div className="app-shell">
        <aside className="app-sidebar" aria-label="Dashboard navigation">
          <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => setActiveView('home')}>
            <ClipboardList size={18} />
            <span>Home</span>
          </button>
          <button className={activeView === 'whatsapp-groups' ? 'active' : ''} type="button" onClick={() => setActiveView('whatsapp-groups')}>
            <UsersRound size={18} />
            <span>WhatsApp Groups</span>
          </button>
          <button className={activeView === 'shashtipoorthi' ? 'active' : ''} type="button" onClick={() => openEventView('shashtipoorthi')}>
            <HeartHandshake size={18} />
            <span>Shashtipoorthi Shanthi</span>
          </button>
          <button className={activeView === 'bhimaratha' ? 'active' : ''} type="button" onClick={() => openEventView('bhimaratha')}>
            <HeartHandshake size={18} />
            <span>Bhimaratha Shanthi</span>
          </button>
          <button className={activeView === 'mangalya-donors' ? 'active' : ''} type="button" onClick={() => setActiveView('mangalya-donors')}>
            <Gift size={18} />
            <span>Sponsorship Management</span>
          </button>
          <button className={activeView === 'previous-donors' ? 'active' : ''} type="button" onClick={() => setActiveView('previous-donors')}>
            <MessageCircle size={18} />
            <span>Previous Donors</span>
          </button>
        </aside>

        <div className="app-content">
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

          {activeView === 'home' ? (
            <>
              <section className="summary-section">
                <div className="section-heading">
                  <div>
                    <p>Dashboard Summary</p>
                    <h2>Registration and collection overview</h2>
                  </div>
                </div>
                <div className="stats-grid">
                  <StatCard icon={UsersRound} label="Total registrations" value={summary.total} />
                  <StatCard icon={HeartHandshake} label="Shashtipoorthi" value={summary.shashtipoorthi} onClick={() => openEventView('shashtipoorthi')} />
                  <StatCard icon={HeartHandshake} label="Bhimaratha" value={summary.bhimaratha} onClick={() => openEventView('bhimaratha')} />
                  <StatCard icon={CheckCircle2} label="Full Paid" value={summary.fullPaid} tone="success" />
                  <StatCard icon={CircleDollarSign} label="Part Paid" value={summary.partPaid} tone="warning" />
                  <StatCard icon={HeartHandshake} label="Free Sponsorship" value={summary.freeSponsorship} tone="success" onClick={goToFreeSponsorship} />
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
                  <StatCard icon={FileText} label="Shashtipoorthi Receipts Pending" value={summary.shashtipoorthiReceiptsPending} tone="warning" onClick={() => openEventView('shashtipoorthi')} />
                  <StatCard icon={FileText} label="Bhimaratha Receipts Generated" value={summary.bhimarathaReceiptsGenerated} tone="success" onClick={() => openEventView('bhimaratha')} />
                  <StatCard icon={FileText} label="Bhimaratha Receipts Pending" value={summary.bhimarathaReceiptsPending} tone="warning" onClick={() => openEventView('bhimaratha')} />
                  <StatCard icon={IndianRupee} label="Expected collection" value={formatCurrency(summary.expected)} />
                  <StatCard icon={IndianRupee} label="Received collection" value={formatCurrency(summary.received)} tone="success" />
                  <StatCard icon={IndianRupee} label="Balance receivable" value={formatCurrency(summary.balance)} tone="warning" />
                </div>
              </section>

              <SeatGuidanceSection rows={rows} />

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

              <WhatsAppGroupSetup rows={rows} groupConfig={groupConfig} />

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
            </>
          ) : null}

          {activeView === 'whatsapp-groups' ? <WhatsAppGroupSetup rows={rows} groupConfig={groupConfig} /> : null}

          {activeView === 'mangalya-donors' ? <MangalyaDonorsSection donorState={donorState} requirementState={requirementState} requiredBottus={summary.shashtipoorthi} /> : null}

          {activeView === 'previous-donors' ? <PreviousDonorsCampaign donorState={donorState} /> : null}

          {activeView === 'shashtipoorthi' || activeView === 'bhimaratha' ? (
            <section className="management-section" id="participant-management-dashboard">
        <div className="section-heading">
          <div>
            <p>Participant Management</p>
            <h2>{EVENTS[activeEvent].shortLabel} verified registrations</h2>
          </div>
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
            {PAYMENT_STATUSES.map((statusValue) => <option key={statusValue}>{statusValue}</option>)}
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
          <SelectField label="Sort" value={participantSort} onChange={setParticipantSort}>
            {PARTICIPANT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectField>
        </div>

        <div className="event-note">
          <b>{EVENTS[activeEvent].label}</b>
          <span>{formatCurrency(EVENTS[activeEvent].contribution)} per couple · Sorted by {participantSortLabel(participantSort)}</span>
        </div>

        <SeatGuidanceSection rows={rows} />

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
          ) : null}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
