import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, HeartHandshake, MapPin, Menu, Moon, Phone, ShieldCheck, Sun, X } from 'lucide-react';

const pages = [
  ['home', 'Home'], ['about', 'About MVST'], ['gruha-seva', 'Gruha Seva'],
  ['book-seva', 'Book Seva'], ['upcoming-events', 'Events'], ['booking-status', 'My Booking'], ['contact', 'Contact'],
];
const pageFromLocation = () => pages.some(([key]) => location.hash === `#/${key}`) ? location.hash.slice(2) : 'home';

export function TrustTagline() {
  return <p className="trust-tagline"><span>Mane Manege Vasavi</span><span>Mana Manadali Vasavi</span></p>;
}

export function SevaPortrait({ compact = false }) {
  return <div className={`seva-portrait ${compact ? 'compact' : ''}`}>
    <div className="seva-portrait-halo" aria-hidden="true" />
    <div className="seva-portrait-window"><img src="/mvst-vasavi-seva.jpg" alt="MVST Vasavi Mata Silver Idol, adorned with flowers" fetchPriority="high" /></div>
    <div className="portrait-caption"><span>VASAVI MATA</span><TrustTagline /></div>
  </div>;
}

function PageHeading({ eyebrow, title, children }) {
  return <header className="seva-page-heading"><span className="seva-eyebrow">{eyebrow}</span><h1>{title}</h1>{children ? <p>{children}</p> : null}</header>;
}

function SevaSteps() {
  return <ol className="seva-steps">
    <li><span>01</span><div><h3>Choose a date</h3><p>Select a day and one of two seva times. Tell us a little about your occasion.</p></div></li>
    <li><span>02</span><div><h3>Let us coordinate</h3><p>The MVST Office reviews your request and the arrangements for the visit.</p></div></li>
    <li><span>03</span><div><h3>Welcome Vasavi Mata</h3><p>Once approved, coordinate the final seva and transport details with our team.</p></div></li>
  </ol>;
}

export default function SevaPortal({ bookingForm, bookingStatus, renderLogin }) {
  const [page, setPage] = useState(pageFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [officeLogin, setOfficeLogin] = useState(false);
  const menuButton = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const sync = () => { setPage(pageFromLocation()); setMenuOpen(false); setOfficeLogin(false); };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    document.title = `${pages.find(([key]) => key === page)?.[1] || 'Home'} · MVST Seva`;
  }, [page]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  function openPage(next) {
    if (location.hash !== `#/${next}`) location.hash = `/${next}`;
    setPage(next);
    setMenuOpen(false);
    setOfficeLogin(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => contentRef.current?.focus({ preventScroll: true }));
  }
  const bookAction = (label = 'Book a Seva') => <button className="seva-button" onClick={() => openPage('book-seva')}>{label}<ArrowUpRight size={19} /></button>;

  if (officeLogin) return renderLogin(() => setOfficeLogin(false));

  return <div className="seva-site">
    <a className="seva-skip-link" href="#seva-main" onClick={(event) => { event.preventDefault(); contentRef.current?.focus(); contentRef.current?.scrollIntoView(); }}>Skip to content</a>
    <div className="seva-announcement"><span>॥ Jai Vasavi ॥</span><span>Devotion at home. Together in seva.</span><span>Bengaluru · Since 2019</span></div>
    <header className="seva-site-header">
      <div className="seva-header-inner">
        <button className="seva-brand" onClick={() => openPage('home')} aria-label="MVST Seva home"><img src="/MVST_Logo.jpg" alt="" /><span>MVST <b>Seva</b><small>MANEMANEGE VASAVI SEVA TRUST (R.)</small></span></button>
        <nav className="seva-desktop-nav" aria-label="Main navigation">{pages.filter(([key]) => key !== 'book-seva').map(([key, label]) => <button key={key} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined} onClick={() => openPage(key)}>{label}</button>)}</nav>
        <div className="seva-header-actions"><button className="seva-office-link" aria-label="Office Login" onClick={() => setOfficeLogin(true)}><ShieldCheck size={16} /><span>Office Login</span><b>Office</b></button><button className="seva-menu-toggle" ref={menuButton} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="seva-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
      <nav id="seva-mobile-menu" className="seva-mobile-menu" hidden={!menuOpen} aria-label="Mobile navigation">{pages.map(([key, label]) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => openPage(key)}>{label}<ChevronRight size={16} /></button>)}</nav>
    </header>
    <main id="seva-main" ref={contentRef} tabIndex={-1} className={`seva-main seva-page-${page}`}>
      {page === 'home' && <>
        <section className="seva-home-hero seva-container">
          <div className="seva-home-copy"><span className="seva-eyebrow"><span /> A TRADITION OF DEVOTION & SERVICE</span><h1>Bring her blessings<br /><em>into your home.</em></h1><p>Welcome the MVST Vasavi Mata Silver Idol for Gruha Seva, a special pooja or a cherished family occasion.</p><div className="seva-hero-actions">{bookAction()}<button className="seva-text-link" onClick={() => openPage('gruha-seva')}>Discover Gruha Seva <ArrowRight size={17} /></button></div><div className="seva-hero-reassurance"><ShieldCheck size={17} /><span>Thoughtfully coordinated by the MVST Office</span></div></div>
          <SevaPortrait />
          <div className="seva-hero-footnote"><span>MANEMANEGE VASAVI SEVA TRUST (R.)</span><span>Faith brings us home. Seva brings us together.</span></div>
        </section>
        <section className="seva-time-band"><div className="seva-container"><div><span className="seva-eyebrow">MAKE TIME FOR SEVA</span><h2>One date. Two sacred moments.</h2></div><div className="seva-time"><Sun size={25} /><span>Day seva<strong>9 am — 2 pm</strong></span></div><div className="seva-time"><Moon size={23} /><span>Evening seva<strong>5 pm — 9 pm</strong></span></div><button className="seva-round-link" aria-label="Choose a seva date" onClick={() => openPage('book-seva')}><ArrowUpRight /></button></div></section>
        <section className="seva-container seva-how-section"><div className="seva-section-intro"><span className="seva-eyebrow">FROM YOUR REQUEST TO YOUR HOME</span><h2>A little planning.<br /><em>A meaningful occasion.</em></h2><p>We make it simple to request a visit, while giving every seva the care it deserves.</p><button className="seva-text-link" onClick={() => openPage('booking-status')}>Already requested? Check your booking <ArrowRight size={16} /></button></div><SevaSteps /></section>
        <section className="seva-container"><div className="seva-contact-strip"><HeartHandshake size={36} /><div><h2>Seva begins with a conversation.</h2><p>Have a question about inviting Vasavi Mata? We are here to help.</p></div><a href="tel:+919986287555">Contact MVST <ArrowUpRight size={18} /></a></div></section>
      </>}
      {page === 'book-seva' && <section className="seva-container seva-booking-page"><PageHeading eyebrow="VASAVI MATA GRUHA SEVA" title="Make room for blessings.">Choose a date and time for your seva. Every request is reviewed by the MVST Office before confirmation.</PageHeading>{bookingForm}</section>}
      {page === 'booking-status' && <section className="seva-container seva-status-page"><div className="seva-status-aside"><span className="seva-eyebrow">EVERY SEVA, THOUGHTFULLY PLANNED</span><h2>Your request.<br /><em>One step closer.</em></h2><p>Keep your booking reference handy. A requested date is confirmed only after Office approval.</p><div className="seva-support-line"><Phone size={18} /><a href="tel:+919986287555">Need help? 99862 87555</a></div></div>{bookingStatus}</section>}
      {page === 'about' && <section className="seva-container seva-editorial"><div><PageHeading eyebrow="ABOUT MVST" title="Rooted in devotion. United by seva.">Manemanege Vasavi Seva Trust (R.), Bengaluru — bringing families and our community together in the spirit of Vasavi Mata.</PageHeading><div className="seva-editorial-body"><h2>Faith, carried from home to home.</h2><p>Through Gruha Seva and community programmes, MVST creates opportunities to share in worship, serve one another and honour our traditions.</p><p>Our Vasavi Mata Silver Idol can be requested for home seva and family functions. The MVST Office coordinates each approved visit with the family.</p>{bookAction('Explore a Seva visit')}</div></div><SevaPortrait compact /></section>}
      {page === 'gruha-seva' && <section className="seva-container"><PageHeading eyebrow="VASAVI MATA GRUHA SEVA" title="A sacred visit. A personal occasion.">Invite the MVST Vasavi Mata Silver Idol into your home for worship, a special pooja or a family celebration.</PageHeading><div className="seva-service-layout"><SevaPortrait compact /><div className="seva-service-details"><span className="seva-eyebrow">PLANNING YOUR VISIT</span><h2>Choose your moment.<br /><em>We’ll help with the rest.</em></h2><ul className="seva-detail-list"><li><Sun /><div><h3>Day seva · 9 am–2 pm</h3><p>A morning visit for your home pooja or family function.</p></div></li><li><Moon /><div><h3>Evening seva · 5 pm–9 pm</h3><p>An evening of devotion with your family.</p></div></li><li><ShieldCheck /><div><h3>Confirmed by the Office</h3><p>Selecting an available slot sends a request, not a confirmed booking. Please wait for approval before finalising arrangements.</p></div></li></ul>{bookAction('Choose your date')}</div></div><div className="seva-service-process"><SevaSteps /></div></section>}
      {page === 'upcoming-events' && <section className="seva-container"><PageHeading eyebrow="TOGETHER IN SEVA" title="Gather. Celebrate. Serve.">Community programmes and devotional gatherings from Manemanege Vasavi Seva Trust.</PageHeading><div className="seva-event-empty"><div className="seva-event-icon"><CalendarDays size={34} /></div><span className="seva-eyebrow">UPCOMING PROGRAMMES</span><h2>Something to look forward to.</h2><p>Our next programme will be announced here.<br />In the meantime, bring seva home with a Vasavi Mata visit.</p>{bookAction('Request Gruha Seva')}</div></section>}
      {page === 'contact' && <section className="seva-container"><PageHeading eyebrow="CONTACT MVST" title="We’re here for your seva.">Questions about a visit, an existing request or a community programme? Speak with the MVST team.</PageHeading><div className="seva-contact-layout"><div className="seva-contact-primary"><Phone size={28} /><span className="seva-eyebrow">CALL THE TRUST</span><a href="tel:+919986287555" className="seva-contact-number">99862 87555 <ArrowUpRight size={28} /></a><p>Manemanege Vasavi Seva Trust (R.)</p><span className="seva-contact-location"><MapPin size={17} /> Bengaluru, Karnataka</span></div><div className="seva-contact-help"><h2>How can we help?</h2><button onClick={() => openPage('book-seva')}><CalendarDays /><span>Plan a Gruha Seva<small>Choose your preferred date and time</small></span><ArrowRight /></button><button onClick={() => openPage('booking-status')}><Check /><span>Track an existing request<small>Use your booking reference and mobile</small></span><ArrowRight /></button><p>Please wait for Office approval before making arrangements for a requested date.</p></div></div></section>}
    </main>
    <footer className="seva-site-footer"><div className="seva-container"><div className="seva-footer-top"><div><div className="seva-footer-wordmark">MVST <em>Seva</em></div><TrustTagline /><p>Manemanege Vasavi Seva Trust (R.)<br />Bengaluru · In devotion, together.</p></div><div className="seva-footer-links"><button onClick={() => openPage('gruha-seva')}>Gruha Seva</button><button onClick={() => openPage('booking-status')}>My Booking</button><button onClick={() => openPage('contact')}>Contact MVST</button><button onClick={() => setOfficeLogin(true)}>Office Login <ArrowUpRight size={14} /></button></div></div><div className="seva-footer-bottom"><span>© {new Date().getFullYear()} Manemanege Vasavi Seva Trust (R.)</span><span>॥ Jai Vasavi ॥</span></div></div></footer>
    {page !== 'book-seva' && <div className="seva-mobile-dock"><button onClick={() => openPage('booking-status')}><CalendarDays size={17} />My Booking</button>{bookAction('Book Seva')}</div>}
  </div>;
}
