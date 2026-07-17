import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import {
  BadgeCheck,
  CalendarDays,
  Camera,
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
  Keyboard,
  MessageCircle,
  QrCode,
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
const RECEIPT_PREFIXES = { bhimaratha: 'BS', shashtipoorthi: 'SP' };
const LEGACY_RECEIPT_PREFIXES = { bhimaratha: 'BS26', shashtipoorthi: 'SP26' };
const RECEIPT_TEXT_COLOR = '#0B2D5C';
const receiptLayouts = {
  shashtipoorthi: {
    receiptNo: [
      { x: 77, y: 222, width: 96, height: 24 },
      { x: 556, y: 249, width: 98, height: 24 },
    ],
    date: [
      { x: 388, y: 218, width: 95, height: 23, baselineOffset: -3 },
      { x: 1408, y: 270, width: 122, height: 24, baselineOffset: -3 },
    ],
    coupleName: [
      { x: 162, y: 258, width: 285, height: 62, lineOffset: 0, officeCopy: true },
      { x: 635, y: 310, width: 815, height: 43, lineOffset: -4 },
    ],
    seatNo: [
      { x: 178, y: 389, width: 95, height: 25 },
      { x: 1014, y: 433, width: 132, height: 28 },
    ],
    qrCode: [
      { x: 1435, y: 85, width: 76, height: 76 },
    ],
  },
  bhimaratha: {
    receiptNo: [
      { x: 77, y: 222, width: 96, height: 24 },
      { x: 556, y: 249, width: 98, height: 24 },
    ],
    date: [
      { x: 388, y: 218, width: 95, height: 23, baselineOffset: -3 },
      { x: 1408, y: 270, width: 122, height: 24, baselineOffset: -3 },
    ],
    coupleName: [
      { x: 162, y: 258, width: 285, height: 62, lineOffset: 0, officeCopy: true },
      { x: 635, y: 310, width: 815, height: 43, lineOffset: -4 },
    ],
    seatNo: [
      { x: 178, y: 389, width: 95, height: 25 },
      { x: 1014, y: 433, width: 132, height: 28 },
    ],
    qrCode: [
      { x: 1435, y: 85, width: 76, height: 76 },
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
const DISTRIBUTION_OPERATIONS = {
  meetingAttendance: {
    label: 'Meeting Attendance',
    group: 'Kit Distribution Day',
    statusField: 'meetingAttendance',
    timeField: 'meetingAttendanceTime',
    byField: 'meetingAttendanceBy',
    completedLabel: 'Meeting Attendance',
  },
  kitCollection: {
    label: 'Kit Collection',
    group: 'Kit Distribution Day',
    statusField: 'kitIssued',
    remarkField: 'remarks',
    completedLabel: 'Kit Issued',
  },
  eventAttendance: {
    label: 'Event Attendance',
    group: 'Mahotsava Event Day',
    statusField: 'eventAttendance',
    timeField: 'eventAttendanceTime',
    byField: 'eventAttendanceBy',
    completedLabel: 'Event Attendance',
  },
  madalakkiDistribution: {
    label: 'Madalakki Distribution',
    group: 'Mahotsava Event Day',
    statusField: 'madalakkiGiven',
    timeField: 'madalakkiTime',
    byField: 'madalakkiBy',
    completedLabel: 'Madalakki Given',
  },
  photoFrameDistribution: {
    label: 'Photo Frame Distribution',
    group: 'Mahotsava Event Day',
    statusField: 'photoFrameGiven',
    timeField: 'photoFrameTime',
    byField: 'photoFrameBy',
    completedLabel: 'Photo Frame Given',
  },
};
const DISTRIBUTION_REQUIRED_COLUMNS = [
  'QR Token',
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
];
const VOLUNTEER_STATUS_FILTERS = [
  { value: 'all', label: 'All Participants' },
  { value: 'meetingAttendance', label: 'Meeting Attendance Pending' },
  { value: 'kitCollection', label: 'Kit Pending' },
  { value: 'eventAttendance', label: 'Event Attendance Pending' },
  { value: 'madalakkiDistribution', label: 'Madalakki Pending' },
  { value: 'photoFrameDistribution', label: 'Photo Frame Pending' },
];
const ROLE_PST = 'PST Admin';
const ROLE_VOLUNTEER = 'Volunteer';
const ROLE_CREW = 'Crew';
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
  const legacyPrefix = LEGACY_RECEIPT_PREFIXES[eventType];
  const prefixes = [prefix, legacyPrefix].filter(Boolean).join('|');
  const match = raw.match(new RegExp(`^(?:${prefixes})-(\\d{1,3})$`));
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
    rows.filter((row) => row.eventType === participant.eventType),
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

function loadDataUrlImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load generated QR code'));
    image.src = dataUrl;
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

  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?!T)/);
  if (isoDateOnly) {
    return formatDateParts(Number(isoDateOnly[3]), Number(isoDateOnly[2]), Number(isoDateOnly[1]));
  }

  const slashDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (slashDate) {
    const first = Number(slashDate[1]);
    const second = Number(slashDate[2]);
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    if (year >= 2000) {
      if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
        return formatDateParts(second, first, year);
      }
      if (first >= 1 && first <= 31 && second >= 1 && second <= 12) {
        return formatDateParts(first, second, year);
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
  return 'Receipt will be generated after full payment is received.';
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
  if (box.officeCopy && brideName) return [`${groomName} &`, brideName];
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
  const safeQrToken = String(participant.qrToken || '').trim();
  if (!safeQrToken) {
    throw new Error('Unable to save QR Token. Receipt generation stopped. Please retry.');
  }
  const drawBoxes = (boxes, text, options) => boxes.forEach((box) => fitReceiptText(ctx, text, box, options));
  drawBoxes(layout.receiptNo, safeReceiptNo, { maxFont: 18, minFont: 10, align: 'center' });
  drawBoxes(layout.date, receiptDate, { maxFont: 18, minFont: 10, align: 'center' });
  drawBoxes(layout.seatNo, safeSeatNo, { maxFont: 20, minFont: 11, align: 'center' });
  if (safeQrToken && layout.qrCode) {
    const qrImage = await loadDataUrlImage(await qrTokenToPng(safeQrToken));
    layout.qrCode.forEach((box) => {
      ctx.drawImage(qrImage, box.x, box.y, box.width, box.height);
    });
  }
  layout.coupleName.forEach((box) => {
    fitReceiptText(ctx, receiptCoupleNameLines(ctx, participant, box), box, {
      maxFont: box.officeCopy ? 14 : box.width > 500 ? 20 : 16,
      minFont: 8,
      align: box.officeCopy ? 'left' : 'center',
      lineHeight: box.officeCopy ? 1.85 : 1.14,
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

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function downloadReceipt(dataUrl, participant, receiptNo) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = receiptFileName(participant, receiptNo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function qrTokenToPng(token) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 640,
    color: {
      dark: '#331b16',
      light: '#fffaf0',
    },
  });
}

async function downloadQrPng(participant) {
  const token = String(participant.qrToken || '').trim();
  if (!token) throw new Error('QR token missing for this participant');
  const dataUrl = await qrTokenToPng(token);
  const eventName = participant.eventType === 'shashtipoorthi' ? 'Shashtipoorthi' : 'Bhimaratha';
  const seat = String(participant.seatNo || 'No-Seat').replace(/\s+/g, '').replace(/[^a-z0-9-]+/gi, '-');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `MVST-QR-${eventName}-${seat}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function scanDistributionQr({ token, operation }) {
  const response = await fetch('/api/distribution/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, operation }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || 'Save Failed');
    error.payload = payload;
    throw error;
  }
  return payload;
}

function distributionCompleted(row, operationKey) {
  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  return Boolean(operation && row?.[operation.statusField]);
}

function distributionTimestamp(row, operationKey) {
  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  return operation?.timeField ? row?.[operation.timeField] || '' : '';
}

function distributionCompletedBy(row, operationKey) {
  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  return operation?.byField ? row?.[operation.byField] || '' : '';
}

function isBulkZipSupported() {
  const userAgent = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  return !isIos && !isAndroid;
}

function receiptZipFileName(eventType) {
  const eventName = eventType === 'shashtipoorthi' ? 'Shashtipoorthi' : 'Bheemaratha';
  return `MVST-${eventName}-Receipts-${ACTIVE_EVENT_YEAR}.zip`;
}

function receiptZipEntryName(participant, receiptNo) {
  const receipt = normalizeReceiptNumber(receiptNo, participant.eventType) || String(receiptNo || 'Receipt');
  const seat = String(participant.seatNo || 'No-Seat').replace(/\s+/g, '').replace(/[^a-z0-9-]+/gi, '-');
  return `${receipt}-${seat}.jpg`;
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

async function decodeQrDataUrl(dataUrl) {
  if (!('BarcodeDetector' in window)) {
    throw new Error('QR decoder not available in this browser. Use desktop Chrome or Edge for print readiness verification.');
  }
  const blob = dataUrlToBlob(dataUrl);
  const imageBitmap = await createImageBitmap(blob);
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(imageBitmap);
    const value = codes[0]?.rawValue || '';
    if (!value) throw new Error('QR image could not be decoded');
    return value;
  } finally {
    imageBitmap.close?.();
  }
}

function qrFailureDetails(participant, receiptNo, reason) {
  return {
    receiptNo: receiptNo || normalizeReceiptNumber(participant.receiptNo, participant.eventType) || 'Not Assigned',
    participantName: participantDisplayName(participant),
    seatNo: participant.seatNo || 'No Seat',
    reason,
  };
}

async function verifyQrPrintReadiness(rows, eventType, onProgress = () => {}) {
  const eventRows = sortReceiptSequenceRows(rows.filter((row) => row.eventType === eventType));
  const eligibleReceiptRows = buildBulkReceiptRows(rows, eventType);
  const activeQrTokens = eventRows.map((row) => String(row.qrToken || '').trim()).filter(Boolean);
  const allTokenCounts = rows.reduce((counts, row) => {
    const token = String(row.qrToken || '').trim();
    if (token) counts.set(token, (counts.get(token) || 0) + 1);
    return counts;
  }, new Map());
  const failures = [];
  let qrImagesGenerated = 0;
  let qrDecoded = 0;
  let qrResolved = 0;
  let sheetMatches = 0;
  let receiptPreviews = 0;

  for (let index = 0; index < eventRows.length; index += 1) {
    const participant = eventRows[index];
    const token = String(participant.qrToken || '').trim();
    const receiptNo = suggestedReceiptNumber(rows, participant);
    onProgress(`QR readiness ${index + 1} of ${eventRows.length}: checking QR token...`);
    if (!token) {
      failures.push(qrFailureDetails(participant, receiptNo, 'Missing QR Token'));
      continue;
    }
    if ((allTokenCounts.get(token) || 0) > 1) {
      failures.push(qrFailureDetails(participant, receiptNo, 'Duplicate QR Token'));
      continue;
    }
    try {
      const qrDataUrl = await qrTokenToPng(token);
      qrImagesGenerated += 1;
      const decoded = await decodeQrDataUrl(qrDataUrl);
      qrDecoded += 1;
      if (decoded !== token) {
        failures.push(qrFailureDetails(participant, receiptNo, 'Google Sheet QR Token does not match encoded QR'));
        continue;
      }
      sheetMatches += 1;
      const resolved = rows.find((row) => String(row.qrToken || '').trim() === decoded);
      if (!resolved || resolved.id !== participant.id) {
        failures.push(qrFailureDetails(participant, receiptNo, 'QR resolves to a different participant'));
        continue;
      }
      qrResolved += 1;
    } catch (error) {
      failures.push(qrFailureDetails(participant, receiptNo, error.message || 'QR image validation failed'));
    }
  }

  for (let index = 0; index < eligibleReceiptRows.length; index += 1) {
    const participant = eligibleReceiptRows[index];
    const receiptNo = suggestedReceiptNumber(rows, participant);
    onProgress(`Receipt preview ${index + 1} of ${eligibleReceiptRows.length}: verifying JPG...`);
    try {
      await generateReceiptJpg(participant, receiptNo);
      receiptPreviews += 1;
    } catch (error) {
      failures.push(qrFailureDetails(participant, receiptNo, error.message || 'Receipt preview generation failed'));
    }
  }

  return {
    totalRegistrations: eventRows.length,
    registrationsWithQrToken: activeQrTokens.length,
    registrationsMissingQrToken: eventRows.length - activeQrTokens.length,
    duplicateQrTokens: activeQrTokens.filter((token) => (allTokenCounts.get(token) || 0) > 1).length,
    qrImagesGenerated,
    qrDecoded,
    qrResolved,
    sheetMatches,
    receiptPreviews,
    receiptPreviewExpected: eligibleReceiptRows.length,
    failures,
    qrReady: failures.length === 0 &&
      eventRows.length === activeQrTokens.length &&
      qrImagesGenerated === eventRows.length &&
      qrDecoded === eventRows.length &&
      qrResolved === eventRows.length &&
      sheetMatches === eventRows.length,
    receiptsSafeToPrint: failures.length === 0 && receiptPreviews === eligibleReceiptRows.length,
  };
}

function buildReceiptSendQueue(rows, eventType) {
  const eventRows = rows.filter((row) => row.eventType === eventType && isReceiptEligible(row));
  const orderedRows = sortReceiptSequenceRows(eventRows);
  const ready = [];
  const skipped = [];
  const usedMobiles = new Set();
  orderedRows.forEach((participant) => {
    const mobileValidation = mobileValidationStatus(participant.mobileNumber);
    const hasSeatNo = Boolean(String(participant.seatNo || '').trim());
    const hasTimestamp = Boolean(receiptDateForParticipant(participant));
    const normalizedMobile = normalizeIndianMobileNumber(participant.mobileNumber);
    if (mobileValidation.status !== 'ok' || !hasSeatNo || !hasTimestamp) {
      skipped.push({
        participant,
        issue: mobileValidation.status !== 'ok'
          ? mobileValidation.issue
          : !hasSeatNo
            ? 'Missing Seat No'
            : 'Registration timestamp missing',
      });
      return;
    }
    if (usedMobiles.has(normalizedMobile)) {
      skipped.push({ participant, issue: 'Duplicate mobile number skipped' });
      return;
    }
    usedMobiles.add(normalizedMobile);
      ready.push({
        participant,
        normalizedMobile,
      });
  });
  return { ready, skipped };
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

function buildBalanceReminderMessage(participant) {
  return `🙏 Jai Vasavi 🙏
Dear ${participantDisplayName(participant)},
Thank you for registering for the ${eventDisplayName(participant.eventType)}.
Our records show:
Total Sponsorship Amount: ${formatCurrency(participant.contribution)}
Amount Received: ${formatCurrency(participant.paidAmount)}
Balance Payable: ${formatCurrency(participant.balance)}
We kindly request you to clear the above balance on or before the Kit Distribution Meeting on 19-07-2026.
On receipt of the full payment, your seat confirmation, receipt, and kit collection formalities will be completed.
For any clarification, please contact us.
Thank you.
🙏 Jai Vasavi 🙏
Mane Manege Vasavi Seva Trust (R.), Bengaluru`;
}

function makeWhatsAppMessage(participant, kind) {
  if (kind === 'balance') return buildBalanceReminderMessage(participant);
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

function queueAuditStamp(user) {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-IN'),
    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    at: now.toISOString(),
    user: user?.name || user?.mobile || 'PST',
  };
}

function queueStatusKey(campaignName) {
  return `mvst:whatsapp-queue:${campaignName}`;
}

function readQueueStatus(campaignName) {
  try {
    return JSON.parse(sessionStorage.getItem(queueStatusKey(campaignName)) || '{}');
  } catch {
    return {};
  }
}

function writeQueueStatus(campaignName, recipientId, entry) {
  const current = readQueueStatus(campaignName);
  const next = { ...current, [recipientId]: entry };
  sessionStorage.setItem(queueStatusKey(campaignName), JSON.stringify(next));
  return next;
}

function queueCounts(queue, statusMap) {
  const total = queue.length;
  const sent = queue.filter((item) => statusMap[item.id]?.status === 'Sent').length;
  const skipped = queue.filter((item) => statusMap[item.id]?.status === 'Skipped').length;
  const failed = queue.filter((item) => statusMap[item.id]?.status === 'Failed').length;
  return { total, sent, skipped, failed, remaining: Math.max(total - sent - skipped - failed, 0) };
}

function firstPendingQueueIndex(queue, statusMap) {
  const index = queue.findIndex((item) => !['Sent', 'Skipped'].includes(statusMap[item.id]?.status));
  return index >= 0 ? index : 0;
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
  const typeText = [donor.contributionType, donor.category, donor.canonicalCategory].join(' ').toLowerCase();
  if (typeText.includes('mangalya donor')) return 0;
  const explicitAmount = Number(donor.previousDonationAmount || 0);
  if (explicitAmount > 0) return explicitAmount;
  const year = String(donor.eventYear || '').trim();
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

function buildMandaliInvitationMessage(contact) {
  return `🙏 *Invitation*
Dear Sri. *${contact.name || 'Community Leader'}*
*${contact.role || 'Representative'}*
*${contact.mandali || 'Arya Vysya Mandali'}, ${contact.area || 'Bengaluru'}*

The *Mane Mange Vasavi Seva Trust* cordially invites you to a special meeting regarding the *4th Samoohika Shanthi Program*, which will be held on *2nd August 2026* at *Shubh Convention, J.P. Nagar, Bengaluru*.

This meeting has been organized to discuss the program arrangements and coordination. Your valuable presence, guidance, and support will greatly contribute to the success of this prestigious community event.

📅 *Meeting Details*
*Date:* Sunday, 19th July 2026
*Time:* 11:30 AM
*Venue:* Ashaktha Poshaka Sabha, V.V. Puram, Bengaluru

📍 *Location:*
https://maps.app.goo.gl/zuERscMMxvcCBcbd6?g_st=awb

🍽️ *Followed by lunch.*

We look forward to your gracious presence and valuable suggestions.

*With Regards,*
*Hariprasad Varada*
*President*
*Manemanege Vasavi Seva Trust (R.)*`;
}

function makeMandaliWhatsAppUrl(contact) {
  const normalizedMobile = normalizeIndianMobileNumber(contact.mobileNumber);
  const encodedText = encodeURIComponent(buildMandaliInvitationMessage(contact));
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
      const error = new Error(payload.error || `Google Sheets API returned ${response.status}`);
      error.status = response.status;
      throw error;
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
      if (backendError.status === 401 || backendError.status === 403) {
        if (!aliveRef.current) return;
        setRows([]);
        setLastRefreshedAt(null);
        setDataSource('Authentication required');
        setWriteEnabled(false);
        setStatus('Login required');
        setError('Login session expired. Please logout and login again.');
        setIsLive(false);
        return;
      }
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
    scanDistribution: async ({ token, operation }) => {
      const payload = await scanDistributionQr({ token, operation });
      applyPayload(payload);
      setStatus(`Distribution scan saved. Data Source: ${sourceText(payload.source, payload.writeEnabled)}. Last refreshed: ${formatRefreshTime(payload.refreshedAt)}`);
      return payload;
    },
    refresh: () => load(true),
  };
}

function useMangalyaDonors(enabled = true) {
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
    if (!enabled) return undefined;
    const aliveRef = { current: true };
    load(false, aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, [enabled]);

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

function useSponsorshipRequirements(enabled = true) {
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
    if (!enabled) return undefined;
    const aliveRef = { current: true };
    load(false, aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, [enabled]);

  return {
    requirements,
    status,
    error,
    isRefreshing,
    refresh: () => load(true),
  };
}

function useMandaliContacts(enabled = true) {
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('Loading Mandali contacts...');
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load(aliveRef = { current: true }) {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/mandali-contacts', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || `Mandali contacts API returned ${response.status}`);
      if (!aliveRef.current) return;
      setContacts(payload.rows || []);
      setStatus(`Private CSV. Last refreshed: ${formatRefreshTime(payload.refreshedAt || new Date().toISOString())}`);
      setError(payload.notice || '');
    } catch (loadError) {
      if (!aliveRef.current) return;
      setContacts([]);
      setError(loadError.message || 'Unable to load Mandali contacts');
    } finally {
      if (aliveRef.current) setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!enabled) return undefined;
    const aliveRef = { current: true };
    load(aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, [enabled]);

  return {
    contacts,
    status,
    error,
    isRefreshing,
    refresh: () => load(),
  };
}

function useWhatsAppGroupConfig(enabled = true) {
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
    if (!enabled) return undefined;
    const aliveRef = { current: true };
    load(aliveRef);
    return () => {
      aliveRef.current = false;
    };
  }, [enabled]);

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
    if (!validTimestampDate) {
      setMessage('Registration timestamp missing');
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
        <p><span>Receipt No</span>{validReceiptNumber ? savedReceiptNo : suggestedReceiptNo}</p>
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
          {!validReceiptNumber ? (
            <button type="button" onClick={saveReceiptNumber} disabled={generating || !writeEnabled}>
              <Save size={16} /> Save Receipt No
            </button>
          ) : null}
        </div>
      ) : (
        <div className="receipt-unavailable">
          <AlertTriangle size={16} />
          <span>{!paymentReceiptEligible ? receiptUnavailableMessage(participant) : !validTimestampDate ? 'Registration timestamp missing' : 'Valid event-wise receipt number is required'}</span>
        </div>
      )}
      {validTimestampDate && !validReceiptNumber ? (
        <div className="receipt-actions-row">
          <button type="button" onClick={saveReceiptNumber} disabled={generating || !writeEnabled}>
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
      {!validReceiptNumber ? <small>Preview, download, refresh, close, and WhatsApp share do not reserve receipt number {suggestedReceiptNo}. Use Save Receipt No when ready.</small> : null}
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

const MANDALI_RECIPIENT_FILTERS = [
  { id: 'presidents-secretaries', label: 'Presidents + Secretaries', test: (contact) => ['President', 'Secretary'].includes(contact.role) },
  { id: 'presidents', label: 'Presidents only', test: (contact) => contact.role === 'President' },
  { id: 'secretaries', label: 'Secretaries only', test: (contact) => contact.role === 'Secretary' },
  { id: 'representatives', label: 'Representatives only', test: (contact) => contact.role === 'Representative' },
  { id: 'all', label: 'All contacts', test: () => true },
];

function MandaliDetailsSection({ mandaliState, user }) {
  const { contacts, status, error, isRefreshing, refresh } = mandaliState;
  const campaignName = 'Community Leaders Meeting – 19 July 2026';
  const [filterId, setFilterId] = useState('presidents-secretaries');
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueStarted, setQueueStarted] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [statusMap, setStatusMap] = useState(() => readQueueStatus(campaignName));
  const [message, setMessage] = useState('');
  const selectedFilter = MANDALI_RECIPIENT_FILTERS.find((filter) => filter.id === filterId) || MANDALI_RECIPIENT_FILTERS[0];
  const visibleContacts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return contacts
      .filter((contact) => selectedFilter.test(contact))
      .filter((contact) => {
        if (!search) return true;
        return [contact.name, contact.role, contact.mandali, contact.area, contact.maskedMobile]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });
  }, [contacts, query, selectedFilter]);
  const readyContacts = visibleContacts.filter((contact) => contact.validWhatsApp && !contact.duplicateMobile);
  const currentContact = queue[queueIndex];
  const progress = queueCounts(queue, statusMap);
  const retryContacts = queue.filter((contact) => ['Skipped', 'Failed'].includes(statusMap[contact.id]?.status));
  const summary = useMemo(() => ({
    mandalis: new Set(contacts.map((contact) => `${contact.slNo}-${contact.mandali}`)).size,
    total: contacts.length,
    presidents: contacts.filter((contact) => contact.role === 'President').length,
    secretaries: contacts.filter((contact) => contact.role === 'Secretary').length,
    representatives: contacts.filter((contact) => contact.role === 'Representative').length,
    valid: contacts.filter((contact) => contact.validWhatsApp).length,
    invalid: contacts.filter((contact) => !contact.validWhatsApp).length,
    duplicates: contacts.filter((contact) => contact.duplicateMobile).length,
  }), [contacts]);

  function prepareQueue() {
    const latestStatus = readQueueStatus(campaignName);
    setStatusMap(latestStatus);
    setQueue(readyContacts);
    setQueueStarted(false);
    setQueueIndex(firstPendingQueueIndex(readyContacts, latestStatus));
    setMessage(readyContacts.length ? 'Campaign preview ready. Open WhatsApp to mark sent and advance automatically.' : 'No WhatsApp-ready contacts for this filter.');
  }

  function recordQueueStatus(contact, status, remarks = '') {
    const stamp = queueAuditStamp(user);
    const nextStatus = writeQueueStatus(campaignName, contact.id, {
      campaign: campaignName,
      recipient: contact.name,
      status,
      date: stamp.date,
      time: stamp.time,
      at: stamp.at,
      user: stamp.user,
      remarks,
    });
    setStatusMap(nextStatus);
    return nextStatus;
  }

  function advanceToNextPending(nextStatusMap, startIndex = queueIndex + 1) {
    const nextIndex = queue.findIndex((contact, index) => index >= startIndex && !['Sent', 'Skipped'].includes(nextStatusMap[contact.id]?.status));
    if (nextIndex >= 0) {
      setQueueIndex(nextIndex);
      return;
    }
    setMessage('Mandali WhatsApp queue completed.');
  }

  function failContact(contact, reason) {
    const nextStatus = recordQueueStatus(contact, 'Failed', reason);
    setMessage(reason);
    setQueueStarted(true);
    setStatusMap(nextStatus);
  }

  function openContact(index) {
    const contact = queue[index];
    if (!contact) return;
    if (!contact.validWhatsApp) {
      failContact(contact, 'Invalid or missing WhatsApp mobile.');
      return;
    }
    if (contact.duplicateMobile) {
      failContact(contact, 'Duplicate mobile number. Review before sending.');
      return;
    }
    let url = '';
    try {
      const personalizedMessage = buildMandaliInvitationMessage(contact);
      if (!personalizedMessage.trim()) throw new Error('Personalized message generation failed.');
      url = makeMandaliWhatsAppUrl(contact);
      if (!url.startsWith('https://wa.me/')) throw new Error('WhatsApp URL generation failed.');
    } catch (error) {
      failContact(contact, error.message || 'WhatsApp message validation failed.');
      return;
    }
    const nextStatus = recordQueueStatus(contact, 'Sent', 'Opened WhatsApp for manual sending.');
    window.open(url, '_blank', 'noopener,noreferrer');
    setQueueStarted(true);
    setMessage('Marked Sent and opened WhatsApp. Queue advanced to the next pending recipient.');
    advanceToNextPending(nextStatus, index + 1);
  }

  function openCurrent() {
    if (!queue.length) return;
    openContact(queueIndex);
  }

  function skipCurrent() {
    if (!currentContact) return;
    const nextStatus = recordQueueStatus(currentContact, 'Skipped', 'Skipped by operator.');
    setQueueStarted(true);
    setMessage('Skipped. Queue advanced to the next pending recipient.');
    advanceToNextPending(nextStatus);
  }

  function retryContact(contact) {
    const nextStatus = { ...statusMap };
    delete nextStatus[contact.id];
    sessionStorage.setItem(queueStatusKey(campaignName), JSON.stringify(nextStatus));
    setStatusMap(nextStatus);
    const index = queue.findIndex((item) => item.id === contact.id);
    if (index >= 0) setQueueIndex(index);
    setMessage('Retry ready. Open WhatsApp when ready.');
  }

  async function copyCurrentMessage() {
    if (!currentContact) return;
    try {
      await navigator.clipboard.writeText(buildMandaliInvitationMessage(currentContact));
      setMessage('Current personalized message copied.');
    } catch {
      setMessage('Automatic copy is blocked in this browser.');
    }
  }

  return (
    <section className="sponsorship-section">
      <div className="section-heading">
        <div>
          <p>Bangalore Arya Vysya Mandali Details</p>
          <h2>Community leaders WhatsApp invitation queue</h2>
        </div>
        <button className="refresh-button" type="button" onClick={refresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
      <div className="event-note">
        <b>{status}</b>
        <span>Source: private local CSV. Representatives are excluded from the default campaign.</span>
      </div>
      {error ? <div className="error-strip"><AlertTriangle size={18} /><span>{error}</span></div> : null}

      <div className="stats-grid">
        <StatCard icon={UsersRound} label="Total Mandalis" value={summary.mandalis} />
        <StatCard icon={UsersRound} label="Total Contacts" value={summary.total} />
        <StatCard icon={ShieldCheck} label="Presidents" value={summary.presidents} tone="success" />
        <StatCard icon={BadgeCheck} label="Secretaries" value={summary.secretaries} />
        <StatCard icon={UsersRound} label="Representatives" value={summary.representatives} />
        <StatCard icon={MessageCircle} label="Valid WhatsApp" value={summary.valid} tone="success" />
        <StatCard icon={AlertTriangle} label="Missing / Invalid" value={summary.invalid} tone="danger" />
        <StatCard icon={AlertTriangle} label="Duplicate Numbers" value={summary.duplicates} tone="warning" />
      </div>

      <div className="filters-grid">
        <SelectField label="Recipients" value={filterId} onChange={setFilterId} options={MANDALI_RECIPIENT_FILTERS.map((filter) => ({ value: filter.id, label: filter.label }))} />
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area, Mandali, name, role" />
        </label>
      </div>

      <div className="bulk-whatsapp-panel donor-bulk-panel">
        <div className="bulk-actions">
          <button type="button" onClick={prepareQueue}>Generate Queue</button>
          <span>Visible: {visibleContacts.length} · WhatsApp-ready: {readyContacts.length}</span>
        </div>
        {queue.length ? (
          <div className="bulk-preview">
            <div className="bulk-preview-head">
              <div>
                <p>{campaignName}</p>
                <h3>{progress.total} Total · {progress.sent} Sent · {progress.skipped} Skipped · {progress.failed} Failed · {progress.remaining} Remaining</h3>
              </div>
              <button type="button" onClick={() => { setQueue([]); setQueueStarted(false); }}>Clear</button>
            </div>
            {currentContact ? (
              <div className="donor-current-preview">
                <div><p>Current Message Preview</p><strong>{currentContact.name} - {currentContact.role}</strong></div>
                <textarea readOnly rows="12" value={buildMandaliInvitationMessage(currentContact)} />
              </div>
            ) : null}
            <div className="bulk-queue-controls">
              <button type="button" onClick={openCurrent}>Open WhatsApp</button>
              <button type="button" onClick={skipCurrent}>Skip</button>
              <button type="button" onClick={copyCurrentMessage}>Copy Message</button>
            </div>
            {retryContacts.length ? (
              <div className="receipt-skipped-list">
                <strong>Skipped / Failed</strong>
                {retryContacts.slice(0, 8).map((contact) => (
                  <span key={`retry-${contact.id}`}>{contact.name} - {statusMap[contact.id]?.status} <button type="button" onClick={() => retryContact(contact)}>Retry</button></span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {message ? <small>{message}</small> : null}
      </div>

      <div className="donor-card-grid">
        {visibleContacts.slice(0, 80).map((contact) => (
          <article className="donor-card" key={contact.id}>
            <p className="donor-kicker">{contact.role}</p>
            <h3>{contact.name}</h3>
            <p>{contact.mandali}</p>
            <div className="receipt-meta-grid">
              <p><span>Area</span>{contact.area || 'Not entered'}</p>
              <p><span>WhatsApp</span>{contact.validWhatsApp ? contact.maskedMobile : 'Invalid / missing'}</p>
              <p><span>Status</span>{contact.duplicateMobile ? 'Duplicate warning' : contact.validWhatsApp ? 'Ready' : 'Needs mobile'}</p>
            </div>
            <pre className="donor-message-preview">{buildMandaliInvitationMessage(contact)}</pre>
            <div className="donor-actions">
              <button type="button" onClick={() => window.open(makeMandaliWhatsAppUrl(contact), '_blank', 'noopener,noreferrer')} disabled={!contact.validWhatsApp || contact.duplicateMobile}>Open WhatsApp</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PreviousDonorsCampaign({ donorState }) {
  const { donors, status, error, writeEnabled, isRefreshing, refresh, saveDonor } = donorState;
  const campaignName = 'Previous Donors Campaign 2026';
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
  const [statusMap, setStatusMap] = useState(() => readQueueStatus(campaignName));
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
  const previousDonorProgress = queueCounts(queue, statusMap);

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
    const latestStatus = readQueueStatus(campaignName);
    setStatusMap(latestStatus);
    setQueue(readyDonors);
    setQueueStarted(false);
    setQueueIndex(firstPendingQueueIndex(readyDonors, latestStatus));
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

  function recordPreviousDonorStatus(donor, statusValue, remarks = '') {
    const stamp = queueAuditStamp();
    const nextStatus = writeQueueStatus(campaignName, donor.id, {
      campaign: campaignName,
      recipient: sponsorDisplayName(donor),
      status: statusValue,
      date: stamp.date,
      time: stamp.time,
      at: stamp.at,
      user: stamp.user,
      remarks,
    });
    setStatusMap(nextStatus);
    return nextStatus;
  }

  function advancePreviousDonorQueue(nextStatusMap, startIndex = queueIndex + 1) {
    const nextIndex = queue.findIndex((donor, index) => index >= startIndex && !['Sent', 'Skipped'].includes(nextStatusMap[donor.id]?.status));
    if (nextIndex >= 0) {
      setQueueIndex(nextIndex);
      setQueueOpened(false);
    } else {
      setMessage('Previous Donors WhatsApp queue completed.');
      setQueueOpened(false);
    }
  }

  function openQueueDonor(index) {
    const donor = queue[index];
    if (!donor) return;
    try {
      if (!donorMobileIsValid(donor)) throw new Error('Invalid or missing WhatsApp mobile.');
      const personalizedMessage = buildPreviousDonorAppealMessage(donor);
      if (!personalizedMessage.trim()) throw new Error('Personalized message generation failed.');
      const url = makePreviousDonorWhatsAppUrl(donor);
      if (!url.startsWith('https://wa.me/')) throw new Error('WhatsApp URL generation failed.');
      const nextStatus = recordPreviousDonorStatus(donor, 'Sent', 'Opened WhatsApp for manual sending.');
      window.open(url, '_blank', 'noopener,noreferrer');
      advancePreviousDonorQueue(nextStatus, index + 1);
    } catch (openError) {
      recordPreviousDonorStatus(donor, 'Failed', openError.message || 'WhatsApp validation failed.');
      setMessage(openError.message || 'WhatsApp validation failed.');
    }
    setQueueStarted(true);
    setQueueOpened(true);
  }

  function openCurrentQueueDonor() {
    if (!queue.length) return;
    openQueueDonor(queueIndex);
  }

  function skipQueueDonor() {
    if (!currentQueueDonor) return;
    const nextStatus = recordPreviousDonorStatus(currentQueueDonor, 'Skipped', 'Skipped by operator.');
    setQueueStarted(true);
    advancePreviousDonorQueue(nextStatus);
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
                <h3>{previousDonorProgress.total} Total · {previousDonorProgress.sent} Sent · {previousDonorProgress.skipped} Skipped · {previousDonorProgress.failed} Failed · {previousDonorProgress.remaining} Remaining</h3>
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
                  <span>Current {queueIndex + 1} of {queue.length}: {sponsorDisplayName(currentQueueDonor || {})}</span>
                  <button type="button" onClick={openCurrentQueueDonor}>Open WhatsApp</button>
                  <button type="button" onClick={skipQueueDonor}>Skip</button>
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

  async function openBulkDonor(index) {
    const donor = bulkQueue[index];
    if (!donor) return;
    if (!writeEnabled) {
      setBulkMessage('Read-only mode. Status was not changed.');
      return;
    }
    setBulkMessage('');
    setSavingBulk(true);
    try {
      if (!donorMobileIsValid(donor)) throw new Error('Invalid or missing WhatsApp mobile.');
      const personalizedMessage = buildMangalyaDonorAppealMessage(donor);
      if (!personalizedMessage.trim()) throw new Error('Personalized message generation failed.');
      const url = makeMangalyaDonorWhatsAppUrl(donor);
      if (!url.startsWith('https://wa.me/')) throw new Error('WhatsApp URL generation failed.');
      await saveDonor(donor.id, donorJourneySentUpdates('appeal'));
      window.open(url, '_blank', 'noopener,noreferrer');
      setBulkStarted(true);
      setBulkOpened(true);
      const nextIndex = index + 1;
      if (nextIndex < bulkQueue.length) {
        setBulkIndex(nextIndex);
        setBulkOpened(false);
        setBulkMessage('Marked sent and opened WhatsApp. Queue advanced to the next sponsor.');
      } else {
        setBulkMessage('Sponsorship WhatsApp queue completed.');
      }
    } catch (saveError) {
      setBulkMessage(saveError.message || 'Unable to open WhatsApp and save sent status');
    } finally {
      setSavingBulk(false);
    }
  }

  function openCurrentBulkDonor() {
    if (!bulkQueue.length) return;
    openBulkDonor(bulkIndex);
  }

  function openNextBulkDonor() {
    if (!bulkQueue[bulkIndex]) return;
    openBulkDonor(bulkIndex);
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
                  <button type="button" onClick={openCurrentBulkDonor} disabled={!writeEnabled || savingBulk}>{savingBulk ? 'Saving' : 'Open WhatsApp'}</button>
                  <button type="button" onClick={openNextBulkDonor} disabled={!currentBulkDonor || savingBulk}>Open Current</button>
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

function VolunteerParticipantCard({ participant }) {
  const mobile = normalizeIndianMobileNumber(participant.mobileNumber);
  const validMobile = mobileValidationStatus(participant.mobileNumber).status === 'ok';
  return (
    <article className="participant-card volunteer-safe-card">
      <div className="participant-top">
        <div>
          <p className="event-label">{EVENTS[participant.eventType]?.shortLabel}</p>
          <h3>Seat {participant.seatNo || 'Not entered'}</h3>
          <p className="muted">{participant.groomName || 'Husband not entered'} & {participant.brideName || 'Wife not entered'}</p>
        </div>
      </div>
      <div className="detail-grid">
        <p><span>Husband Name</span>{participant.groomName || 'Not entered'}</p>
        <p><span>Wife Name</span>{participant.brideName || 'Not entered'}</p>
        <p><span>Mobile</span>{participant.mobileNumber || 'Missing'}</p>
        <p><span>Event</span>{eventDisplayName(participant.eventType)}</p>
      </div>
      <div className="volunteer-call-row">
        <span>{participant.mobileNumber || 'Mobile missing'}</span>
        {validMobile ? <a href={`tel:+${mobile}`}>📞 Call</a> : <small>Valid mobile required</small>}
      </div>
      <div className="volunteer-status-grid">
        {Object.entries(DISTRIBUTION_OPERATIONS).map(([key, operation]) => (
          <span key={key} className={distributionCompleted(participant, key) ? 'done' : 'pending'}>
            {operation.completedLabel}: {distributionCompleted(participant, key) ? 'Done' : 'Pending'}
          </span>
        ))}
      </div>
    </article>
  );
}

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      setUser(response.ok && payload.ok ? payload.user : null);
    } finally {
      setLoading(false);
    }
  }

  async function login({ mobile, pin }) {
    setError('');
    setNotice('');
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, pin }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      setError(payload.error || 'Login failed');
      return false;
    }
    setUser(payload.user);
    return true;
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => {});
    setNotice('');
    setUser(null);
  }

  async function changePassword({ currentPassword, newPassword, confirmPassword }) {
    setError('');
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to change password');
    setNotice(payload.message || 'Password changed successfully. Please login again.');
    setUser(null);
    return payload.message || 'Password changed successfully. Please login again.';
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { user, loading, error, notice, login, logout, changePassword };
}

function LoginPage({ auth }) {
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    await auth.login({ mobile, pin });
    setSubmitting(false);
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <form className="login-card" onSubmit={submit}>
          <img className="login-header-image" src="/mvst-login-header.jpg" alt="Mane Manege Vasavi Seva Trust" />
          <div className="login-title">
            <p>MVST Seva Portal</p>
            <h1>Login</h1>
          </div>
          <label>
            <span>Mobile Number</span>
            <div className="login-mobile-row">
              <b>+91</b>
              <input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="numeric" autoComplete="username" placeholder="Mobile number" />
            </div>
          </label>
          <label>
            <span>PIN</span>
            <div className="login-pin-row">
              <input value={pin} onChange={(event) => setPin(event.target.value)} type={showPin ? 'text' : 'password'} inputMode="numeric" autoComplete="current-password" placeholder="••••" />
              <button type="button" onClick={() => setShowPin((value) => !value)}>{showPin ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          {auth.error ? <small>{auth.error}</small> : null}
          {auth.notice ? <small className="success-message">{auth.notice}</small> : null}
          <button type="submit" disabled={submitting}>{submitting ? 'Logging in' : 'Login'}</button>
        </form>
        <footer className="login-footer">
          <strong>Powered by MVST SEVA PORTAL</strong>
          <span>© 2026 Puneeth Kumar S R. All Rights Reserved. Proprietary and Confidential.</span>
        </footer>
      </div>
    </main>
  );
}

function ChangePasswordSection({ auth, forced = false }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.currentPassword) {
      setError('Current password is required.');
      return;
    }
    if (form.newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password must match.');
      return;
    }
    setSaving(true);
    try {
      const successMessage = await auth.changePassword(form);
      setMessage(successMessage);
    } catch (changeError) {
      setError(changeError.message || 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="management-section">
      <div className="section-heading">
        <div>
          <p>Change Password</p>
          <h2>{forced ? 'Please change your temporary password' : 'Update your own login password'}</h2>
        </div>
      </div>
      {forced ? (
        <div className="event-note">
          <b>Password change required</b>
          <span>Your account was created or reset with a temporary password. Please change it before continuing.</span>
        </div>
      ) : null}
      <form className="admin-panel change-password-card" onSubmit={submit}>
        <label>
          <span>Current Password</span>
          <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
        </label>
        <label>
          <span>New Password</span>
          <input type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
        </label>
        <label>
          <span>Confirm New Password</span>
          <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
        </label>
        <button className="save-button" type="submit" disabled={saving}>{saving ? 'Changing Password' : 'Change Password'}</button>
        {message ? <span className="save-message">{message}</span> : null}
        {error ? <span className="save-message warning">{error}</span> : null}
      </form>
    </section>
  );
}

function UserAccessSection() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', role: ROLE_VOLUNTEER, pin: '', active: true });

  async function loadUsers() {
    const response = await fetch('/api/users', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load users');
    setUsers(payload.rows || []);
  }

  useEffect(() => {
    loadUsers().catch((error) => setMessage(error.message));
  }, []);

  async function addUser(event) {
    event.preventDefault();
    setMessage('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to add user');
      setUsers(payload.rows || []);
      setForm({ name: '', mobile: '', role: ROLE_VOLUNTEER, pin: '', active: true });
      setMessage('User access saved.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateUser(id, updates) {
    setMessage('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to update user');
      setUsers(payload.rows || []);
      setMessage('User access updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resetUserPassword(id) {
    const nextPassword = window.prompt('Enter temporary password, minimum 4 characters');
    if (!nextPassword) return;
    setMessage('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: nextPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to reset password');
      setUsers(payload.rows || []);
      setMessage(payload.message || 'Password reset. User must change it on next login.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="management-section user-access-section">
      <div className="section-heading">
        <div>
          <p>User Access</p>
          <h2>PST-only login and role management</h2>
        </div>
      </div>
      <form className="user-access-form" onSubmit={addUser}>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
        <input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} placeholder="Mobile" inputMode="numeric" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option>{ROLE_VOLUNTEER}</option>
          <option>{ROLE_CREW}</option>
          <option>{ROLE_PST}</option>
        </select>
        <input value={form.pin} onChange={(event) => setForm({ ...form, pin: event.target.value })} placeholder="4 or 6 digit PIN" inputMode="numeric" type="password" />
        <button type="submit">Add Volunteer</button>
      </form>
      {message ? <small>{message}</small> : null}
      <div className="user-access-list">
        {users.map((user) => (
          <article key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <span>{user.mobile} · {user.role} · {user.active ? 'Active' : 'Disabled'}</span>
              <small>Last Login: {user.lastLogin || 'Never'}</small>
              <small>{user.mustChangePassword ? 'Password change required' : 'Password OK'}{user.passwordChangedAt ? ` · Last changed: ${user.passwordChangedAt}` : ''}</small>
              {user.passwordAudit?.length ? <small>Last Password Action: {user.passwordAudit[user.passwordAudit.length - 1].action} by {user.passwordAudit[user.passwordAudit.length - 1].changedByName || 'System'}</small> : null}
            </div>
            <div>
              <button type="button" onClick={() => updateUser(user.id, { active: !user.active })}>{user.active ? 'Disable Volunteer' : 'Enable Volunteer'}</button>
              <button type="button" onClick={() => resetUserPassword(user.id)}>Reset Password</button>
            </div>
          </article>
        ))}
      </div>
    </section>
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

const BALANCE_FILTERS = ['All', 'Shashtipoorthi', 'Bhimaratha', 'Part Paid', 'Pending'];

function balanceRowMatchesFilter(row, filter) {
  if (filter === 'Shashtipoorthi') return row.eventType === 'shashtipoorthi';
  if (filter === 'Bhimaratha') return row.eventType === 'bhimaratha';
  if (filter === 'Part Paid') return row.paymentStatus === 'Part Paid';
  if (filter === 'Pending') return row.paymentStatus === 'Pending';
  return true;
}

function BalanceReceivableModal({ rows, filter, setFilter, totalBalance, onClose, onOpenParticipant, onEditPayment }) {
  const visibleRows = rows.filter((row) => balanceRowMatchesFilter(row, filter));
  const visibleTotal = visibleRows.reduce((sum, row) => sum + Number(row.balance || 0), 0);

  return (
    <div className="balance-modal-backdrop" role="dialog" aria-modal="true" aria-label="Balance receivable participants">
      <div className="balance-modal">
        <div className="balance-modal-head">
          <div>
            <span>Balance Receivable</span>
            <strong>{formatCurrency(totalBalance)}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close balance receivable list">
            <X size={18} />
          </button>
        </div>

        <div className="balance-summary-row">
          <span>Participants with Balance: <b>{visibleRows.length}</b></span>
          <span>Total Balance Receivable: <b>{formatCurrency(visibleTotal)}</b></span>
        </div>

        <div className="balance-filter-row">
          {BALANCE_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="balance-list">
          {visibleRows.length ? visibleRows.map((participant) => {
            const mobileValidation = mobileValidationStatus(participant.mobileNumber);
            const balanceActionEligible =
              Number(participant.balance || 0) > 0 &&
              ['Part Paid', 'Pending'].includes(participant.paymentStatus) &&
              !isFreeSponsorship(participant);
            const canSendBalance = balanceActionEligible && mobileValidation.status === 'ok';
            return (
              <article className="balance-card" key={participant.id}>
                <div className="balance-card-main">
                  <span>{EVENTS[participant.eventType]?.shortLabel || participant.eventType}</span>
                  <strong>{participantDisplayName(participant)}</strong>
                  <small>Seat {participant.seatNo || 'Not entered'} · {participant.paymentStatus}</small>
                </div>
                <div className="balance-card-money">
                  <span><small>Total</small><b>{formatCurrency(participant.contribution)}</b></span>
                  <span><small>Received</small><b>{formatCurrency(participant.paidAmount)}</b></span>
                  <span><small>Balance</small><b>{formatCurrency(participant.balance)}</b></span>
                </div>
                <div className="balance-card-mobile">
                  <span>{participant.mobileNumber || 'Mobile missing'}</span>
                  <small>{mobileValidation.status === 'ok' ? 'Valid mobile' : mobileValidation.issue}</small>
                </div>
                <div className="balance-card-actions">
                  <button type="button" onClick={() => onOpenParticipant(participant)}>Open Participant</button>
                  {canSendBalance ? (
                    <a href={makeWhatsAppUrl(participant, 'balance')} target="_blank" rel="noreferrer">
                      Send Balance WhatsApp
                    </a>
                  ) : balanceActionEligible ? <span className="action-note">Valid mobile required</span> : null}
                  <button type="button" onClick={() => onEditPayment(participant)}>Edit Payment</button>
                </div>
              </article>
            );
          }) : (
            <p className="balance-empty">No participants match this balance filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DistributionDashboard({ rows, operationKey, onOpenList }) {
  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  const completed = rows.filter((row) => distributionCompleted(row, operationKey));
  const pending = rows.filter((row) => !distributionCompleted(row, operationKey));
  return (
    <div className="stats-grid distribution-stats-grid">
      <StatCard icon={UsersRound} label="Total Registrations" value={rows.length} onClick={() => onOpenList('total', operationKey)} />
      <StatCard icon={CheckCircle2} label={`${operation.completedLabel}`} value={completed.length} tone="success" onClick={() => onOpenList('completed', operationKey)} />
      <StatCard icon={AlertTriangle} label={`${operation.label} Pending`} value={pending.length} tone="warning" onClick={() => onOpenList('pending', operationKey)} />
    </div>
  );
}

function DistributionListModal({ rows, operationKey, filterType, eventFilter, setEventFilter, onClose }) {
  const operation = DISTRIBUTION_OPERATIONS[operationKey];
  const filteredRows = rows
    .filter((row) => eventFilter === 'All' || row.eventType === eventFilter)
    .filter((row) => {
      if (filterType === 'completed') return distributionCompleted(row, operationKey);
      if (filterType === 'pending') return !distributionCompleted(row, operationKey);
      return true;
    });

  return (
    <div className="balance-modal-backdrop" role="dialog" aria-modal="true" aria-label="Distribution participant list">
      <div className="balance-modal distribution-modal">
        <div className="balance-modal-head">
          <div>
            <span>{operation.label}</span>
            <strong>{filteredRows.length} participants</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Close distribution list"><X size={18} /></button>
        </div>
        <div className="balance-filter-row">
          {['All', 'shashtipoorthi', 'bhimaratha'].map((item) => (
            <button key={item} type="button" className={eventFilter === item ? 'active' : ''} onClick={() => setEventFilter(item)}>
              {item === 'All' ? 'All' : EVENTS[item].shortLabel}
            </button>
          ))}
        </div>
        <div className="balance-list">
          {filteredRows.map((participant) => (
            <article className="balance-card" key={participant.id}>
              <div className="balance-card-main">
                <span>{EVENTS[participant.eventType]?.shortLabel}</span>
                <strong>{participantDisplayName(participant)}</strong>
                <small>Seat {participant.seatNo || 'Not entered'}</small>
              </div>
              <div className="receipt-meta-grid">
                <p><span>Status</span>{distributionCompleted(participant, operationKey) ? 'Completed' : 'Pending'}</p>
                <p><span>Date/Time</span>{distributionTimestamp(participant, operationKey) || '-'}</p>
                <p><span>Completed By</span>{distributionCompletedBy(participant, operationKey) || '-'}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function QRPreviewPanel({ participant }) {
  const [qrUrl, setQrUrl] = useState('');
  const [message, setMessage] = useState('');

  async function previewQr() {
    setMessage('');
    try {
      setQrUrl(await qrTokenToPng(participant.qrToken));
    } catch (error) {
      setMessage(error.message || 'Unable to generate QR');
    }
  }

  async function downloadQr() {
    setMessage('');
    try {
      await downloadQrPng(participant);
      setMessage('QR PNG downloaded. Use the same QR on both spouse ID cards.');
    } catch (error) {
      setMessage(error.message || 'Unable to download QR');
    }
  }

  return (
    <div className="qr-preview-card">
      <div>
        <strong>{participantDisplayName(participant)}</strong>
        <span>{EVENTS[participant.eventType]?.shortLabel} · Seat {participant.seatNo || 'Not entered'}</span>
      </div>
      {qrUrl ? <img src={qrUrl} alt="Registration QR preview" /> : null}
      <div className="qr-preview-actions">
        <button type="button" onClick={previewQr}><QrCode size={16} /> Preview QR</button>
        <button type="button" onClick={downloadQr}><Download size={16} /> Download QR PNG</button>
      </div>
      {message ? <small>{message}</small> : null}
    </div>
  );
}

function VolunteerDistributionMonitor({ rows }) {
  const [filter, setFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('All');
  const visibleRows = sortParticipants(rows, 'seat-asc')
    .filter((row) => eventFilter === 'All' || row.eventType === eventFilter)
    .filter((row) => filter === 'all' || !distributionCompleted(row, filter));

  return (
    <div className="volunteer-monitor">
      <div className="section-heading compact-heading">
        <div>
          <p>Volunteer Monitor</p>
          <h2>Read-only participant distribution status</h2>
        </div>
      </div>
      <div className="balance-filter-row volunteer-filter-row">
        {VOLUNTEER_STATUS_FILTERS.map((item) => (
          <button key={item.value} type="button" className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="balance-filter-row volunteer-filter-row">
        {['All', 'shashtipoorthi', 'bhimaratha'].map((item) => (
          <button key={item} type="button" className={eventFilter === item ? 'active' : ''} onClick={() => setEventFilter(item)}>
            {item === 'All' ? 'Both Events' : EVENTS[item].shortLabel}
          </button>
        ))}
      </div>
      <div className="volunteer-list-summary">
        <span>Visible participants: <b>{visibleRows.length}</b></span>
        <span>No payment, receipt, donor, or campaign data is shown here.</span>
      </div>
      <div className="volunteer-participant-list">
        {visibleRows.map((participant) => {
          const mobile = normalizeIndianMobileNumber(participant.mobileNumber);
          const validMobile = mobileValidationStatus(participant.mobileNumber).status === 'ok';
          return (
            <article className="volunteer-participant-card" key={participant.id}>
              <div className="volunteer-participant-head">
                <span>{EVENTS[participant.eventType]?.shortLabel}</span>
                <strong>Seat {participant.seatNo || 'Not entered'}</strong>
              </div>
              <div className="volunteer-name-grid">
                <p><span>Husband</span>{participant.groomName || 'Not entered'}</p>
                <p><span>Wife</span>{participant.brideName || 'Not entered'}</p>
              </div>
              <div className="volunteer-call-row">
                <span>{participant.mobileNumber || 'Mobile missing'}</span>
                {validMobile ? <a href={`tel:+${mobile}`}>📞 Call</a> : <small>Valid mobile required</small>}
              </div>
              <div className="volunteer-status-grid">
                {Object.entries(DISTRIBUTION_OPERATIONS).map(([key, operation]) => (
                  <span key={key} className={distributionCompleted(participant, key) ? 'done' : 'pending'}>
                    {operation.completedLabel}: {distributionCompleted(participant, key) ? 'Done' : 'Pending'}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
        {!visibleRows.length ? <p className="balance-empty">No participants match this volunteer filter.</p> : null}
      </div>
    </div>
  );
}

function QRVideoScanner({ disabled, onScan }) {
  const [videoElement, setVideoElement] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    window.__mvstQrScanHandler = onScan;
    return () => {
      if (window.__mvstQrScanHandler === onScan) delete window.__mvstQrScanHandler;
    };
  }, [onScan]);

  useEffect(() => {
    if (!videoElement || disabled || !('BarcodeDetector' in window)) return undefined;
    let cancelled = false;
    let stream = null;
    let timeoutId = null;
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        videoElement.srcObject = stream;
        await videoElement.play();
        setStatus('Camera scanner active. Point at the QR code.');
        scanLoop();
      } catch (error) {
        setStatus('Camera permission blocked. Use manual token entry.');
      }
    }

    async function scanLoop() {
      if (cancelled || disabled) return;
      try {
        const codes = await detector.detect(videoElement);
        const token = codes[0]?.rawValue;
        if (token) {
          window.__mvstQrScanHandler?.(token);
          timeoutId = setTimeout(scanLoop, 2200);
          return;
        }
      } catch (error) {
        setStatus('Camera scan failed. Use manual token entry.');
      }
      timeoutId = setTimeout(scanLoop, 350);
    }

    start();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [videoElement, disabled]);

  if (!('BarcodeDetector' in window)) {
    return <div className="camera-fallback"><Camera size={20} /><span>Camera QR scanning is not available in this browser.</span></div>;
  }

  return (
    <div className="camera-scanner">
      <video ref={setVideoElement} muted playsInline aria-label="QR scanner camera preview" />
      <small>{status || 'Starting camera scanner...'}</small>
    </div>
  );
}

function QRDistributionModule({ rows, writeEnabled, scanDistribution, user, isPst }) {
  const [activeOperation, setActiveOperation] = useState('meetingAttendance');
  const operatorName = user?.name || user?.mobile || '';
  const [manualToken, setManualToken] = useState('');
  const [search, setSearch] = useState('');
  const [scanState, setScanState] = useState({ type: 'idle', message: 'Select operation and scan a QR.' });
  const [isSaving, setIsSaving] = useState(false);
  const [listState, setListState] = useState(null);
  const [eventFilter, setEventFilter] = useState('All');
  const [selectedQrParticipant, setSelectedQrParticipant] = useState(null);
  const operation = DISTRIBUTION_OPERATIONS[activeOperation];
  const searchableRows = rows.filter((row) => {
    const text = [participantDisplayName(row), row.seatNo, row.mobileNumber, EVENTS[row.eventType]?.shortLabel].join(' ').toLowerCase();
    return !search.trim() || text.includes(search.trim().toLowerCase());
  });
  const scannerSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (scanState.type === 'success' || scanState.type === 'duplicate' || scanState.type === 'error') {
      const timeout = setTimeout(() => setScanState({ type: 'idle', message: 'Ready for next QR scan.' }), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [scanState]);

  async function handleTokenScan(token) {
    if (isSaving) return;
    if (!operatorName.trim()) {
      setScanState({ type: 'error', message: 'Login required before scanning.' });
      return;
    }
    if (!writeEnabled) {
      setScanState({ type: 'error', message: 'Read-only mode. Distribution scan cannot be saved.' });
      return;
    }
    setIsSaving(true);
    setScanState({ type: 'saving', message: 'Saving scan to Google Sheet...' });
    try {
      const result = await scanDistribution({ token: String(token || '').trim(), operation: activeOperation });
      const participant = result.participant;
      if (result.status === 'already-completed') {
        setScanState({
          type: 'duplicate',
          message: `Already Completed · ${operation.label} · ${participantDisplayName(participant)} · Seat ${participant.seatNo || '-'} · ${result.completedAt || '-'} · ${result.completedBy || '-'}`,
        });
      } else {
        setScanState({
          type: 'success',
          message: `Completed Successfully · ${operation.completedLabel} · ${participantDisplayName(participant)} · ${EVENTS[participant.eventType]?.shortLabel} · Seat ${participant.seatNo || '-'} · ${result.completedAt}`,
        });
      }
      setManualToken('');
    } catch (error) {
      setScanState({ type: 'error', message: error.message || 'Save Failed. Status was not changed. Please scan again.' });
    } finally {
      setIsSaving(false);
    }
  }

  function openList(filterType, operationKey) {
    setListState({ filterType, operationKey });
    setEventFilter('All');
  }

  return (
    <section className="management-section qr-distribution-section">
      <div className="section-heading">
        <div>
          <p>QR Operations</p>
          <h2>Scan and auto-save volunteer operations</h2>
        </div>
      </div>

      <div className="distribution-audit-card">
        <strong>Read-only Sheet audit completed</strong>
        <span>Current sheets already have Kit Issued and Remarks. Kit Collection reuses those fields. Only genuinely missing QR/attendance/event-day columns are listed below.</span>
        <details>
          <summary>Required columns</summary>
          <div className="distribution-column-list">
            {DISTRIBUTION_REQUIRED_COLUMNS.map((column) => <span key={column}>{column}</span>)}
          </div>
        </details>
      </div>

      <div className="distribution-groups">
        <article className="distribution-group-card">
          <p>📅 Kit Distribution Day</p>
          <button className={activeOperation === 'meetingAttendance' ? 'active' : ''} type="button" onClick={() => setActiveOperation('meetingAttendance')}>Meeting Attendance</button>
          <button className={activeOperation === 'kitCollection' ? 'active' : ''} type="button" onClick={() => setActiveOperation('kitCollection')}>Kit Collection</button>
        </article>
        <article className="distribution-group-card">
          <p>🌸 Mahotsava Day</p>
          <button className={activeOperation === 'eventAttendance' ? 'active' : ''} type="button" onClick={() => setActiveOperation('eventAttendance')}>Event Attendance</button>
          <button className={activeOperation === 'madalakkiDistribution' ? 'active' : ''} type="button" onClick={() => setActiveOperation('madalakkiDistribution')}>Madalakki Distribution</button>
          <button className={activeOperation === 'photoFrameDistribution' ? 'active' : ''} type="button" onClick={() => setActiveOperation('photoFrameDistribution')}>Photo Frame Distribution</button>
        </article>
      </div>

      <div className="distribution-dashboard-block">
        <p className="event-label">Kit Distribution Day</p>
        <DistributionDashboard rows={rows} operationKey="meetingAttendance" onOpenList={openList} />
        <DistributionDashboard rows={rows} operationKey="kitCollection" onOpenList={openList} />
        <p className="event-label">Mahotsava Event Day</p>
        <DistributionDashboard rows={rows} operationKey="eventAttendance" onOpenList={openList} />
        <DistributionDashboard rows={rows} operationKey="madalakkiDistribution" onOpenList={openList} />
        <DistributionDashboard rows={rows} operationKey="photoFrameDistribution" onOpenList={openList} />
      </div>

      <div className="distribution-scanner-card">
        <div className="distribution-scanner-head">
          <div>
            <span>Selected Operation</span>
            <strong>{operation.label}</strong>
          </div>
          <div className="operator-identity"><Keyboard size={17} /><span>Logged in user</span><strong>{operatorName}</strong></div>
        </div>
        <div className={`scan-status ${scanState.type}`}>
          <Camera size={18} />
          <span>{scanState.message}</span>
        </div>
        <QRVideoScanner disabled={isSaving || !operatorName.trim() || !writeEnabled} onScan={handleTokenScan} />
        <div className="manual-scan-row">
          <label className="search-field">
            <QrCode size={17} />
            <input value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="Manual QR token entry" disabled={isSaving} />
          </label>
          <button type="button" onClick={() => handleTokenScan(manualToken)} disabled={isSaving || !manualToken.trim()}>
            {isSaving ? 'Saving' : 'Scan Token'}
          </button>
        </div>
        <small>{scannerSupported ? 'Camera QR scanning can be enabled in supported browsers. Manual token entry remains available for owner/admin fallback.' : 'Camera QR scanning is not available in this browser. Use manual token entry, seat search, or participant search.'}</small>
      </div>

      <VolunteerDistributionMonitor rows={rows} />

      {isPst ? <div className="qr-tools-grid">
        <div className="controls">
          <label className="search-field">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search seat, name, mobile for QR preview" />
          </label>
        </div>
        <div className="qr-preview-list">
          {searchableRows.slice(0, 8).map((participant) => (
            <button key={participant.id} type="button" className={selectedQrParticipant?.id === participant.id ? 'active' : ''} onClick={() => setSelectedQrParticipant(participant)}>
              <strong>{participantDisplayName(participant)}</strong>
              <span>{EVENTS[participant.eventType]?.shortLabel} · Seat {participant.seatNo || 'Not entered'}</span>
            </button>
          ))}
        </div>
        {selectedQrParticipant ? <QRPreviewPanel participant={selectedQrParticipant} /> : null}
      </div> : null}

      {listState ? (
        <DistributionListModal
          rows={rows}
          operationKey={listState.operationKey}
          filterType={listState.filterType}
          eventFilter={eventFilter}
          setEventFilter={setEventFilter}
          onClose={() => setListState(null)}
        />
      ) : null}
    </section>
  );
}

function App({ auth }) {
  const user = auth.user;
  const isPst = user?.role === ROLE_PST;
  const isVolunteerRole = user?.role === ROLE_VOLUNTEER || user?.role === ROLE_CREW;
  const mustChangePassword = Boolean(user?.mustChangePassword);
  const { rows, status, error, isLive, isRefreshing, dataSource, writeEnabled, saveRegistration, scanDistribution, refresh } = useParticipants();
  const donorState = useMangalyaDonors(isPst);
  const requirementState = useSponsorshipRequirements(isPst);
  const mandaliState = useMandaliContacts(isPst);
  const groupConfig = useWhatsAppGroupConfig(isPst);
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
  const [qrPrintReadiness, setQrPrintReadiness] = useState(null);
  const [receiptQueueEvent, setReceiptQueueEvent] = useState('');
  const [receiptQueue, setReceiptQueue] = useState([]);
  const [receiptQueueSkipped, setReceiptQueueSkipped] = useState([]);
  const [receiptQueueStarted, setReceiptQueueStarted] = useState(false);
  const [receiptQueueIndex, setReceiptQueueIndex] = useState(0);
  const [receiptQueueMessage, setReceiptQueueMessage] = useState('');
  const [receiptQueueOpening, setReceiptQueueOpening] = useState(false);
  const [receiptQueueSaving, setReceiptQueueSaving] = useState(false);
  const [receiptQueueSentCount, setReceiptQueueSentCount] = useState(0);
  const [receiptQueueSkippedCount, setReceiptQueueSkippedCount] = useState(0);
  const [receiptQueueSkippedIds, setReceiptQueueSkippedIds] = useState(() => new Set());
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceModalFilter, setBalanceModalFilter] = useState('All');

  useEffect(() => {
    if (mustChangePassword && activeView !== 'change-password') {
      setActiveView('change-password');
      return;
    }
    if (isVolunteerRole && !['qr-distribution', 'shashtipoorthi', 'bhimaratha', 'change-password'].includes(activeView)) {
      setActiveView('qr-distribution');
    }
  }, [isVolunteerRole, activeView, mustChangePassword]);

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

  const balanceReceivableRows = useMemo(() => {
    return [...rows]
      .filter((row) => Number(row.balance || 0) > 0)
      .filter((row) => !isFreeSponsorship(row))
      .sort((a, b) => {
        const balanceDifference = Number(b.balance || 0) - Number(a.balance || 0);
        if (balanceDifference !== 0) return balanceDifference;
        const timeA = timestampValue(a.timestamp);
        const timeB = timestampValue(b.timestamp);
        if (timeA !== null && timeB !== null && timeA !== timeB) return timeB - timeA;
        if (timeA !== null && timeB === null) return -1;
        if (timeA === null && timeB !== null) return 1;
        return participantDisplayName(a).localeCompare(participantDisplayName(b));
      });
  }, [rows]);

  const balanceReceivableTotal = useMemo(
    () => balanceReceivableRows.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    [balanceReceivableRows],
  );

  const newRegistrationRows = useMemo(
    () => sortParticipants(rows.filter((row) => !row.treasurerVerified), 'latest'),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = rows
      .filter((row) => row.eventType === activeEvent)
      .filter((row) => (isPst ? row.treasurerVerified : true))
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
  }, [rows, activeEvent, query, paymentFilter, verifiedFilter, kitFilter, participantSort, isPst]);

  const currentBulkItem = bulkQueue[bulkQueueIndex];
  const hasNextBulkItem = bulkQueueStarted && bulkQueueIndex < bulkQueue.length - 1;
  const currentReceiptQueueItem = receiptQueue[receiptQueueIndex];
  const currentReceiptQueueNo = currentReceiptQueueItem
    ? suggestedReceiptNumber(rows, currentReceiptQueueItem.participant)
    : '';
  const currentReceiptMobileStatus = currentReceiptQueueItem
    ? mobileValidationStatus(currentReceiptQueueItem.participant.mobileNumber).status
    : 'Not started';
  const receiptQueueRemaining = receiptQueueStarted ? Math.max(receiptQueue.length - receiptQueueIndex - 1, 0) : receiptQueue.length;
  const bulkZipSupported = isBulkZipSupported();

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

  async function openBulkItem(index) {
    const item = bulkQueue[index];
    if (!item) return;
    if (!writeEnabled || !item.participant?.id || !['welcome', 'payment'].includes(bulkQueueType)) {
      setBulkSentMessage('Read-only mode. Status was not changed.');
      return;
    }
    setBulkSentMessage('');
    setMarkingBulkSent(true);
    try {
      const mobileStatus = mobileValidationStatus(item.participant.mobileNumber);
      if (mobileStatus.status !== 'ok') throw new Error(mobileStatus.issue || 'Invalid mobile number.');
      const messageText = makeWhatsAppMessage(item.participant, item.messageKind);
      if (!String(messageText || '').trim()) throw new Error('Personalized message generation failed.');
      const url = makeWhatsAppUrl(item.participant, item.messageKind);
      if (!url.startsWith('https://wa.me/')) throw new Error('WhatsApp URL generation failed.');
      const sentDate = deliveryDateStamp();
      const updates =
        bulkQueueType === 'welcome'
          ? { welcomeSent: true, welcomeSentDate: sentDate }
          : { paymentSent: true, paymentSentDate: sentDate };
      await saveRegistration(item.participant.id, updates);
      window.open(url, '_blank', 'noopener,noreferrer');
      setBulkQueueStarted(true);
      const nextIndex = index + 1;
      if (nextIndex < bulkQueue.length) {
        setBulkQueueIndex(nextIndex);
        setBulkSentMessage('Marked sent and opened WhatsApp. Queue advanced to the next participant.');
      } else {
        setBulkSentMessage('Bulk WhatsApp queue completed.');
      }
    } catch (error) {
      setBulkSentMessage(error.message || 'Unable to open WhatsApp and save sent status');
    } finally {
      setMarkingBulkSent(false);
    }
  }

  function confirmBulkQueue() {
    if (!bulkQueue.length) return;
    setBulkQueueStarted(true);
    setBulkQueueIndex(0);
    openBulkItem(0);
  }

  function openNextBulkMessage() {
    if (!bulkQueue[bulkQueueIndex]) return;
    openBulkItem(bulkQueueIndex);
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

  function prepareReceiptSendQueue(eventType = activeEvent) {
    const { ready, skipped } = buildReceiptSendQueue(rows, eventType);
    setReceiptQueueEvent(eventType);
    setReceiptQueue(ready);
    setReceiptQueueSkipped(skipped);
    setReceiptQueueStarted(false);
    setReceiptQueueIndex(0);
    setReceiptQueueSentCount(0);
    setReceiptQueueSkippedCount(0);
    setReceiptQueueSkippedIds(new Set());
    setReceiptQueueMessage(
      ready.length
        ? 'Receipt queue ready. Confirm to open one WhatsApp message at a time.'
        : 'No receipt-ready participants found for this event.',
    );
  }

  function clearReceiptSendQueue() {
    setReceiptQueueEvent('');
    setReceiptQueue([]);
    setReceiptQueueSkipped([]);
    setReceiptQueueStarted(false);
    setReceiptQueueIndex(0);
    setReceiptQueueSentCount(0);
    setReceiptQueueSkippedCount(0);
    setReceiptQueueSkippedIds(new Set());
    setReceiptQueueMessage('');
  }

  function advanceReceiptQueue(rowsOverride = rows) {
    const nextIndex = receiptQueueIndex + 1;
    if (nextIndex >= receiptQueue.length) {
      setReceiptQueueStarted(false);
      setReceiptQueueMessage('Receipt queue completed for this session.');
      return;
    }
    setReceiptQueueIndex(nextIndex);
    openReceiptQueueItem(nextIndex, rowsOverride);
  }

  async function openReceiptQueueItem(index, rowsOverride = rows) {
    const item = receiptQueue[index];
    if (!item) return;
    const receiptNo = suggestedReceiptNumber(rowsOverride, item.participant);
    setReceiptQueueOpening(true);
    setReceiptQueueMessage('');
    try {
      const dataUrl = await generateReceiptJpg(item.participant, receiptNo);
      downloadReceipt(dataUrl, item.participant, receiptNo);
      const message = [
        `Namaskara ${participantDisplayName(item.participant)}.`,
        '',
        `Please find the MVST receipt ${receiptNo} downloaded.`,
        'Attach the downloaded receipt JPG and send it manually.',
      ].join('\n');
      const encodedText = encodeURIComponent(message);
      window.open(`https://web.whatsapp.com/send?phone=${item.normalizedMobile}&text=${encodedText}`, '_blank', 'noopener,noreferrer');
      setReceiptQueueMessage(`Opened ${index + 1} of ${receiptQueue.length}: ${participantDisplayName(item.participant)}. Attach the downloaded receipt JPG and send it manually. Click Receipt Sent only after sending.`);
    } catch (error) {
      setReceiptQueueMessage(error.message || 'Unable to open receipt WhatsApp');
    } finally {
      setReceiptQueueOpening(false);
    }
  }

  function confirmReceiptSendQueue() {
    if (!receiptQueue.length) return;
    setReceiptQueueStarted(true);
    setReceiptQueueIndex(0);
    openReceiptQueueItem(0);
  }

  async function markReceiptQueueItemSent() {
    const item = currentReceiptQueueItem;
    if (!item) return;
    const receiptNo = currentReceiptQueueNo;
    if (!writeEnabled) {
      setReceiptQueueMessage('Read-only mode. Receipt number could not be saved. The receipt remains pending. Please retry.');
      return;
    }
    setReceiptQueueSaving(true);
    setReceiptQueueMessage('');
    try {
      const alreadySavedReceiptNo = normalizeReceiptNumber(item.participant.receiptNo, item.participant.eventType);
      let latestRows = rows;
      if (!alreadySavedReceiptNo) {
        const payload = await saveRegistration(item.participant.id, { receiptNo });
        latestRows = payload.rows || latestRows;
      }
      setReceiptQueueSentCount((count) => count + 1);
      setReceiptQueueMessage('Receipt number saved after confirmation.');
      advanceReceiptQueue(latestRows);
    } catch (error) {
      setReceiptQueueMessage('Receipt number could not be saved. The receipt remains pending. Please retry.');
    } finally {
      setReceiptQueueSaving(false);
    }
  }

  function skipReceiptQueueItem() {
    const item = currentReceiptQueueItem;
    if (!item) return;
    const nextSkippedIds = new Set([...receiptQueueSkippedIds, item.participant.id]);
    setReceiptQueueSkippedIds(nextSkippedIds);
    setReceiptQueueSkippedCount((count) => count + 1);
    setReceiptQueueMessage('Skipped for this session. No receipt number was saved.');
    advanceReceiptQueue(rows);
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

  function openParticipantFromBalance(participant) {
    openEventView(participant.eventType);
    setQuery(participant.groomName || participant.brideName || participant.mobileNumber || '');
    setPaymentFilter('All');
    setVerifiedFilter('All');
    setKitFilter('All');
    setBalanceModalOpen(false);
    requestAnimationFrame(() => scrollToSection('participant-management-dashboard'));
  }

  function editPaymentFromBalance(participant) {
    openParticipantFromBalance(participant);
  }

  async function generateBulkReceipts() {
    if (!bulkZipSupported) {
      setBulkReceiptMessage('Bulk ZIP download is available on desktop. Use Receipt WhatsApp Queue on mobile.');
      return;
    }
    const eligibleRows = buildBulkReceiptRows(rows, activeEvent);
    if (!eligibleRows.length) {
      setBulkReceiptMessage('No eligible receipts found for this event');
      return;
    }
    setBulkReceiptGenerating(true);
    setBulkReceiptMessage('Starting QR print readiness verification...');
    setQrPrintReadiness(null);
    const zip = new JSZip();
    const failures = [];
    let preparedCount = 0;
    try {
      const readiness = await verifyQrPrintReadiness(rows, activeEvent, setBulkReceiptMessage);
      setQrPrintReadiness(readiness);
      if (!readiness.qrReady || !readiness.receiptsSafeToPrint) {
        setBulkReceiptMessage('QR Ready: NO. Receipts Safe to Print: NO. Fix the listed issues before bulk printing.');
        return;
      }
      for (let index = 0; index < eligibleRows.length; index += 1) {
        const participant = eligibleRows[index];
        const receiptNo = suggestedReceiptNumber(rows, participant);
        setBulkReceiptMessage(`Preparing receipt ${index + 1} of ${eligibleRows.length}...`);
        try {
          const dataUrl = await generateReceiptJpg(participant, receiptNo);
          zip.file(receiptZipEntryName(participant, receiptNo), dataUrlToBlob(dataUrl));
          preparedCount += 1;
        } catch (error) {
          failures.push({
            receiptNo,
            seatNo: participant.seatNo || 'No Seat',
          });
        }
      }
      if (!preparedCount) {
        setBulkReceiptMessage('No receipt JPGs could be prepared. Please use individual receipt preview to check the first failed row.');
        return;
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, receiptZipFileName(activeEvent));
      const failureText = failures.length
        ? ` Prepared: ${preparedCount}. Failed: ${failures.length}. Failed receipt: ${failures[0].receiptNo} / Seat ${failures[0].seatNo}`
        : `${preparedCount} receipt JPGs prepared successfully.`;
      setBulkReceiptMessage(failureText);
    } catch (error) {
      setBulkReceiptMessage(error.message === 'Load failed'
        ? 'Bulk ZIP download failed in this browser. Use Receipt WhatsApp Queue on mobile or try desktop Chrome.'
        : error.message || 'Unable to generate bulk receipts');
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
          {isPst ? (
            <>
              <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => setActiveView('home')}>
                <ClipboardList size={18} />
                <span>Home</span>
              </button>
              <button className={activeView === 'whatsapp-groups' ? 'active' : ''} type="button" onClick={() => setActiveView('whatsapp-groups')}>
                <UsersRound size={18} />
                <span>WhatsApp Groups</span>
              </button>
            </>
          ) : null}
          <button className={activeView === 'qr-distribution' ? 'active' : ''} type="button" onClick={() => setActiveView('qr-distribution')}>
            <QrCode size={18} />
            <span>QR Operations</span>
          </button>
          <button className={activeView === 'shashtipoorthi' ? 'active' : ''} type="button" onClick={() => openEventView('shashtipoorthi')}>
            <HeartHandshake size={18} />
            <span>Shashtipoorthi Shanthi</span>
          </button>
          <button className={activeView === 'bhimaratha' ? 'active' : ''} type="button" onClick={() => openEventView('bhimaratha')}>
            <HeartHandshake size={18} />
            <span>Bhimaratha Shanthi</span>
          </button>
          {isPst ? (
            <>
              <button className={activeView === 'mangalya-donors' ? 'active' : ''} type="button" onClick={() => setActiveView('mangalya-donors')}>
                <Gift size={18} />
                <span>Sponsorship Management</span>
              </button>
              <button className={activeView === 'previous-donors' ? 'active' : ''} type="button" onClick={() => setActiveView('previous-donors')}>
                <MessageCircle size={18} />
                <span>Previous Donors</span>
              </button>
              <button className={activeView === 'mandali-details' ? 'active' : ''} type="button" onClick={() => setActiveView('mandali-details')}>
                <UsersRound size={18} />
                <span>Mandali Details</span>
              </button>
              <button className={activeView === 'user-access' ? 'active' : ''} type="button" onClick={() => setActiveView('user-access')}>
                <ShieldCheck size={18} />
                <span>User Access</span>
              </button>
            </>
          ) : null}
          <button className={activeView === 'change-password' ? 'active' : ''} type="button" onClick={() => setActiveView('change-password')}>
            <ShieldCheck size={18} />
            <span>Change Password</span>
          </button>
          <button type="button" onClick={auth.logout}>
            <X size={18} />
            <span>Logout</span>
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

          {activeView === 'home' && isPst && !mustChangePassword ? (
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
                  <StatCard icon={IndianRupee} label="Balance receivable" value={formatCurrency(summary.balance)} tone="warning" onClick={() => setBalanceModalOpen(true)} />
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

          {activeView === 'whatsapp-groups' && isPst && !mustChangePassword ? <WhatsAppGroupSetup rows={rows} groupConfig={groupConfig} /> : null}

          {activeView === 'qr-distribution' && !mustChangePassword ? <QRDistributionModule rows={rows} writeEnabled={writeEnabled} scanDistribution={scanDistribution} user={user} isPst={isPst} /> : null}

          {activeView === 'mangalya-donors' && isPst && !mustChangePassword ? <MangalyaDonorsSection donorState={donorState} requirementState={requirementState} requiredBottus={summary.shashtipoorthi} /> : null}

          {activeView === 'previous-donors' && isPst && !mustChangePassword ? <PreviousDonorsCampaign donorState={donorState} /> : null}

          {activeView === 'mandali-details' && isPst && !mustChangePassword ? <MandaliDetailsSection mandaliState={mandaliState} user={user} /> : null}

          {activeView === 'user-access' && isPst && !mustChangePassword ? <UserAccessSection /> : null}

          {activeView === 'change-password' ? <ChangePasswordSection auth={auth} forced={mustChangePassword} /> : null}

          {balanceModalOpen && isPst ? (
            <BalanceReceivableModal
              rows={balanceReceivableRows}
              filter={balanceModalFilter}
              setFilter={setBalanceModalFilter}
              totalBalance={balanceReceivableTotal}
              onClose={() => setBalanceModalOpen(false)}
              onOpenParticipant={openParticipantFromBalance}
              onEditPayment={editPaymentFromBalance}
            />
          ) : null}

          {(activeView === 'shashtipoorthi' || activeView === 'bhimaratha') && !mustChangePassword ? (
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
          {isPst ? (
            <>
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
            </>
          ) : null}
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

        {isPst ? <SeatGuidanceSection rows={rows} /> : null}

        {isPst ? <div className="receipt-bulk-panel">
          <div>
            <p>Bulk Receipt Generation</p>
            <span>{eventDisplayName(activeEvent)} eligible: {buildBulkReceiptRows(rows, activeEvent).length}</span>
          </div>
          {bulkZipSupported ? (
            <button type="button" onClick={generateBulkReceipts} disabled={bulkReceiptGenerating}>
              <FileText size={16} /> {bulkReceiptGenerating ? 'Generating ZIP' : 'Bulk Generate Receipts ZIP'}
            </button>
          ) : (
            <button type="button" onClick={() => prepareReceiptSendQueue(activeEvent)}>
              <Share2 size={16} /> Open Receipt WhatsApp Queue
            </button>
          )}
          {bulkReceiptMessage ? <small>{bulkReceiptMessage}</small> : null}
          {!bulkZipSupported ? <small>Bulk ZIP download is available on desktop. Use Receipt WhatsApp Queue on mobile.</small> : null}
          {qrPrintReadiness ? (
            <div className="receipt-readiness-panel">
              <div className="receipt-meta-grid">
                <p><span>Total registrations</span>{qrPrintReadiness.totalRegistrations}</p>
                <p><span>With QR Token</span>{qrPrintReadiness.registrationsWithQrToken}</p>
                <p><span>Missing QR Token</span>{qrPrintReadiness.registrationsMissingQrToken}</p>
                <p><span>Duplicate QR Tokens</span>{qrPrintReadiness.duplicateQrTokens}</p>
                <p><span>QR images generated</span>{qrPrintReadiness.qrImagesGenerated}</p>
                <p><span>QR decodes successfully</span>{qrPrintReadiness.qrDecoded}</p>
                <p><span>QR resolves correctly</span>{qrPrintReadiness.qrResolved}</p>
                <p><span>Sheet token matches QR</span>{qrPrintReadiness.sheetMatches}</p>
                <p><span>Receipt previews generated</span>{qrPrintReadiness.receiptPreviews} / {qrPrintReadiness.receiptPreviewExpected}</p>
                <p><span>QR Ready</span>{qrPrintReadiness.qrReady ? 'YES' : 'NO'}</p>
                <p><span>Receipts Safe to Print</span>{qrPrintReadiness.receiptsSafeToPrint ? 'YES' : 'NO'}</p>
              </div>
              {qrPrintReadiness.failures.length ? (
                <div className="receipt-readiness-failures">
                  <strong>Fix before printing</strong>
                  {qrPrintReadiness.failures.slice(0, 12).map((failure, index) => (
                    <span key={`${failure.receiptNo}-${failure.seatNo}-${index}`}>
                      {failure.receiptNo} · {failure.participantName} · Seat {failure.seatNo} · {failure.reason}
                    </span>
                  ))}
                  {qrPrintReadiness.failures.length > 12 ? <span>+ {qrPrintReadiness.failures.length - 12} more issues</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div> : null}

        {isPst ? <div className="receipt-bulk-panel receipt-send-panel">
          <div>
            <p>Receipt WhatsApp Queue</p>
            <span>Send receipts one by one for each Shanthi event</span>
          </div>
          <div className="receipt-send-actions">
            <button type="button" onClick={() => prepareReceiptSendQueue('shashtipoorthi')}>
              <Share2 size={16} /> Shashtipoorthi Receipts
            </button>
            <button type="button" onClick={() => prepareReceiptSendQueue('bhimaratha')}>
              <Share2 size={16} /> Bheemaratha Receipts
            </button>
          </div>
          {receiptQueueEvent ? (
            <div className="bulk-preview receipt-send-preview">
              <div className="bulk-preview-head">
                <div>
                  <p>{eventDisplayName(receiptQueueEvent)} Receipt Queue</p>
                  <h3>Ready: {receiptQueue.length} · Skipped: {receiptQueueSkipped.length}</h3>
                </div>
                <button type="button" onClick={clearReceiptSendQueue}>Close</button>
              </div>
              {receiptQueue.length ? (
                <>
                  <div className="bulk-preview-list">
                    {receiptQueue.map((item, index) => (
                      <div className={receiptQueueStarted && index === receiptQueueIndex ? 'active' : ''} key={`${item.participant.eventType}-${item.participant.id}-${index}`}>
                        <strong>{participantDisplayName(item.participant)}</strong>
                        <span>{suggestedReceiptNumber(rows, item.participant)}</span>
                        <span>{item.participant.seatNo}</span>
                        <span>{item.participant.mobileNumber}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bulk-queue-controls">
                    {!receiptQueueStarted ? (
                      <button type="button" onClick={confirmReceiptSendQueue} disabled={receiptQueueOpening}>
                        Confirm & Start
                      </button>
                    ) : (
                      <>
                        <div className="receipt-queue-progress">
                          <span>Participant {receiptQueueIndex + 1} of {receiptQueue.length}</span>
                          <span>Remaining: {receiptQueueRemaining}</span>
                          <span>Sent this session: {receiptQueueSentCount}</span>
                          <span>Skipped this session: {receiptQueueSkippedCount}</span>
                          <span>Participant: {participantDisplayName(currentReceiptQueueItem?.participant || {})}</span>
                          <span>Seat: {currentReceiptQueueItem?.participant?.seatNo || 'Missing'}</span>
                          <span>Suggested Receipt No.: {currentReceiptQueueNo}</span>
                          <span>Mobile status: {currentReceiptMobileStatus}</span>
                        </div>
                        <div className="receipt-queue-actions">
                          <button type="button" onClick={markReceiptQueueItemSent} disabled={receiptQueueOpening || receiptQueueSaving}>
                            {receiptQueueSaving ? 'Saving' : 'Receipt Sent'}
                          </button>
                          <button type="button" onClick={skipReceiptQueueItem} disabled={receiptQueueOpening || receiptQueueSaving}>
                            Skip
                          </button>
                          <button type="button" onClick={clearReceiptSendQueue} disabled={receiptQueueOpening || receiptQueueSaving}>
                            Cancel Queue
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="bulk-empty">No eligible receipt contacts found for this event.</p>
              )}
              {receiptQueueSkipped.length ? (
                <div className="receipt-skipped-list">
                  <strong>Skipped</strong>
                  {receiptQueueSkipped.slice(0, 8).map((item, index) => (
                    <span key={`${item.participant.id}-${index}`}>{participantDisplayName(item.participant)} - {item.issue}</span>
                  ))}
                  {receiptQueueSkipped.length > 8 ? <span>+ {receiptQueueSkipped.length - 8} more skipped</span> : null}
                </div>
              ) : null}
              {receiptQueueMessage ? <small>{receiptQueueMessage}</small> : null}
              {!writeEnabled ? <small>Read-only mode: receipt number will not be saved after confirmation.</small> : null}
            </div>
          ) : null}
        </div> : null}

        {isPst ? <div className="bulk-whatsapp-panel">
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
                          Current {bulkQueueIndex + 1} of {bulkQueue.length}: {currentBulkItem?.name}
                        </span>
                        <button type="button" onClick={openNextBulkMessage} disabled={!currentBulkItem || markingBulkSent}>
                          {markingBulkSent ? 'Saving' : 'Open WhatsApp'}
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
        </div> : null}

        <div className="participants-list">
          {filteredRows.length ? (
            filteredRows.map((participant, index) => (
              isPst ? (
                <ParticipantCard
                  key={`${participant.eventType}-${participant.mobileNumber}-${participant.timestamp}-${index}`}
                  participant={participant}
                  rows={rows}
                  writeEnabled={writeEnabled}
                  onSave={saveRegistration}
                />
              ) : (
                <VolunteerParticipantCard
                  key={`${participant.eventType}-${participant.mobileNumber}-${participant.timestamp}-${index}`}
                  participant={participant}
                />
              )
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

function RootApp() {
  const auth = useAuth();
  if (auth.loading) {
    return (
      <main className="login-page">
        <div className="login-card"><h1>MVST Events</h1><p>Checking session...</p></div>
      </main>
    );
  }
  if (!auth.user) return <LoginPage auth={auth} />;
  return <App auth={auth} />;
}

createRoot(document.getElementById('root')).render(<RootApp />);
