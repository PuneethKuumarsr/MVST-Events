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
  ExternalLink,
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
import './styles.css';

const EVENT_DATE = 'Sunday, 02-Aug-2026';
const DEVELOPER_MODE = import.meta.env.VITE_DEVELOPER_MODE === 'true';

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

function cleanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function makeWhatsAppUrl(participant, kind) {
  const event = EVENTS[participant.eventType];
  const name = `${participant.groomName || 'Respected Sir'} & ${
    participant.brideName || 'Madam'
  }`;
  const balanceLine =
    participant.balance > 0
      ? `Balance payable: ${formatCurrency(participant.balance)}.`
      : 'Your contribution is fully received.';

  const messages = {
    welcome: `Namaskara ${name}. Thank you for registering for ${event.label} by Mane Manege Vasavi Seva Trust (R) on ${EVENT_DATE}. Contribution: ${formatCurrency(event.contribution)} per couple. KIT includes: ${event.includes.join(', ')}. Rituals: ${event.rituals}.`,
    confirmation: `Namaskara ${name}. We have received ${formatCurrency(participant.paidAmount)} towards ${event.label}. ${balanceLine} Thank you for your support to Mane Manege Vasavi Seva Trust (R).`,
    balance: `Namaskara ${name}. This is a gentle reminder for ${event.label} on ${EVENT_DATE}. Contribution: ${formatCurrency(event.contribution)}. Received: ${formatCurrency(participant.paidAmount)}. Balance payable: ${formatCurrency(participant.balance)}.`,
    kit: `Namaskara ${name}. KIT distribution for ${event.label} includes all applicable items for your event: ${event.includes.join(', ')}. Please keep your registration details handy. Mane Manege Vasavi Seva Trust (R).`,
  };

  return `https://wa.me/${cleanPhone(participant.mobileNumber)}?text=${encodeURIComponent(
    messages[kind],
  )}`;
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

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className={`stat-card ${tone || ''}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StatusPill({ children, tone }) {
  return <span className={`pill ${tone || ''}`}>{children}</span>;
}

function AdminEditPanel({ participant, writeEnabled, onSave }) {
  const [form, setForm] = useState({
    paidAmount: String(participant.paidAmount || 0),
    paymentStatus: participant.paymentStatus || 'Pending',
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

function ParticipantCard({ participant, writeEnabled, onSave }) {
  const event = EVENTS[participant.eventType];
  const paymentTone =
    participant.paymentStatus === 'Full Paid'
      ? 'success'
      : participant.paymentStatus === 'Part Paid'
        ? 'warning'
        : 'danger';

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
        <StatusPill tone={participant.treasurerVerified ? 'success' : 'neutral'}>
          Treasurer {participant.treasurerVerified ? 'Verified' : 'Pending'}
        </StatusPill>
        <StatusPill tone={participant.kitIssued ? 'success' : 'neutral'}>
          KIT {participant.kitIssued ? 'Issued' : 'Pending'}
        </StatusPill>
      </div>

      <div className="detail-grid">
        <p><span>Address</span>{participant.address || 'Not entered'}</p>
        <p><span>Remarks</span>{participant.remarks || 'No remarks'}</p>
      </div>

      <AdminEditPanel participant={participant} writeEnabled={writeEnabled} onSave={onSave} />

      <div className="links-row">
        <a className={!participant.paymentScreenshot ? 'disabled' : ''} href={participant.paymentScreenshot || undefined} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Payment {linkLabel(participant.paymentScreenshot)}
        </a>
        <a className={!participant.couplePhoto ? 'disabled' : ''} href={participant.couplePhoto || undefined} target="_blank" rel="noreferrer">
          <Image size={16} /> Photo {linkLabel(participant.couplePhoto)}
        </a>
      </div>

      <div className="whatsapp-grid">
        <a href={makeWhatsAppUrl(participant, 'welcome')} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> Welcome
        </a>
        <a href={makeWhatsAppUrl(participant, 'confirmation')} target="_blank" rel="noreferrer">
          <BadgeCheck size={16} /> Payment
        </a>
        <a href={makeWhatsAppUrl(participant, 'balance')} target="_blank" rel="noreferrer">
          <IndianRupee size={16} /> Balance
        </a>
        <a href={makeWhatsAppUrl(participant, 'kit')} target="_blank" rel="noreferrer">
          <Gift size={16} /> KIT
        </a>
      </div>
    </article>
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
  const [activeEvent, setActiveEvent] = useState('shashtipoorthi');
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [verifiedFilter, setVerifiedFilter] = useState('All');
  const [kitFilter, setKitFilter] = useState('All');

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
      kitIssued: rows.filter((row) => row.kitIssued).length,
      expected,
      received,
      balance: expected - received,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => row.eventType === activeEvent)
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
            <span className={isLive ? 'live' : ''}><ShieldCheck size={17} /> {dataSource || 'Google Sheets'} Â· {writeEnabled ? 'Read + Write' : 'Read-only mode'}</span>
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
          <StatCard icon={IndianRupee} label="Pending" value={summary.pending} tone="danger" />
          <StatCard icon={ShieldCheck} label="Treasurer Verified" value={summary.verified} />
          <StatCard icon={Gift} label="KIT Issued" value={summary.kitIssued} />
          <StatCard icon={IndianRupee} label="Expected collection" value={formatCurrency(summary.expected)} />
          <StatCard icon={IndianRupee} label="Received collection" value={formatCurrency(summary.received)} tone="success" />
          <StatCard icon={IndianRupee} label="Balance receivable" value={formatCurrency(summary.balance)} tone="warning" />
        </div>
      </section>

      <section className="management-section">
        <div className="section-heading">
          <div>
            <p>Participant Management</p>
            <h2>Search, filter, and message couples</h2>
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

        <div className="participants-list">
          {filteredRows.length ? (
            filteredRows.map((participant, index) => (
              <ParticipantCard
                key={`${participant.eventType}-${participant.mobileNumber}-${participant.timestamp}-${index}`}
                participant={participant}
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



