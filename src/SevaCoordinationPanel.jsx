import React, { useEffect, useState } from 'react';
import { Clock3, MessageCircle, ShieldCheck } from 'lucide-react';
import './seva-coordination.css';

const groups = [
  ['office', 'Office bearers', 'New requests awaiting approval'],
  ['payment', 'Payment confirmation', 'Verify payments before marking them received'],
  ['temple', 'Temple coordination', 'Both contacts receive confirmed booking details'],
  ['drivers', 'Driver priority', 'Contact one driver at a time, in this order'],
  ['poojaBhajan', 'Pooja & Bhajan team', 'Confirmed booking date, slot and venue'],
];

export default function SevaCoordinationPanel() {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setPayload(null);
    fetch('/api/seva/coordination', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load contact setup.');
        setPayload(result);
      })
      .catch(failure => { if (failure.name !== 'AbortError') setError('Unable to load booking contact setup. Please try again.'); });
    return () => controller.abort();
  }, [attempt]);

  return <details className="seva-coordination">
    <summary><MessageCircle size={19} /><span>Booking notifications & team contacts</span><small>Setup only · not active</small></summary>
    <div className="seva-coordination-body">
      {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry contact setup</button></div>
        : !payload ? <p role="status">Loading private contact setup…</p>
          : <>
            <div className="coordination-notice" role="status"><ShieldCheck size={20} /><div><strong>Automatic messaging is not active</strong><p>{payload.delivery?.message || 'WhatsApp setup is required before any messages can be sent.'}</p></div></div>
            {payload.configured && payload.settings ? <>
              <p className="coordination-privacy">Private Office setup. These contacts are not shown on the public booking pages. Being listed here does not grant Office access.</p>
              <div className="coordination-grid">{groups.map(([key, title, description]) => <section key={key} className="coordination-group">
                <h3>{title}</h3><p>{description}</p>
                <ol>{(payload.settings.groups[key] || []).map((contact, index) => <li key={contact.mobile}>
                  {key === 'drivers' ? <span className="driver-priority">{index + 1}</span> : null}
                  <div><strong>{contact.name}</strong><a href={`tel:+${contact.mobile}`}>+91 {contact.mobile.slice(2, 7)} {contact.mobile.slice(7)}</a></div>
                </li>)}</ol>
              </section>)}</div>
              <div className="coordination-timeout"><Clock3 size={21} /><div><strong>{payload.settings.driverReplyTimeoutMinutes} minutes per driver</strong><p>Planned rule: move to the next driver on decline or no reply within this time. If all are unavailable, alert the Office. No transport is confirmed until a driver accepts.</p></div></div>
              <div className="coordination-workflow"><h3>Notification plan once connected</h3><ol>
                <li>New booking → Office bearers. The request stays Pending Approval.</li>
                <li>After Office approval → request driver availability in priority order.</li>
                <li>After final confirmation → both temple contacts, the assigned driver and the Pooja & Bhajan heads receive the booking details.</li>
              </ol><p>Before activation: connect the official WhatsApp business service, confirm recipient consent, approve message templates and enable the background reply checks.</p></div>
            </> : <p>No booking contacts have been configured yet.</p>}
          </>}
    </div>
  </details>;
}
