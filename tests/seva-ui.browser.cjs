// Run against Vite with mocked data only. No requests or decisions reach live records.
// MVST_PLAYWRIGHT_PATH can point to an existing Playwright installation.
const { chromium } = require(process.env.MVST_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = process.env.MVST_UI_BASE || 'http://127.0.0.1:5179';
const output = process.env.MVST_UI_OUTPUT || 'outputs';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.clock.setFixedTime(new Date('2026-09-22T06:00:00Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let availabilityFails = false;
    let submitFails = true;
    let statusFails = true;
    let loggedIn = false;
    let role = 'PST Admin';
    let coordinationFails = false;
    let coordinationReads = 0;
    const submissions = [];
    let decisions = 0;
    const request = { id: 'ui-only', reference: 'MVST-SEVA-TEST', applicantName: 'Test Family', mobile: '9000000000', requestedDate: '2026-09-24', preferredSlot: 'EVENING', occasion: 'Gruha Seva', status: 'PENDING_APPROVAL', locality: 'Test area', address: 'Test address, Bengaluru' };
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/me') return reply(loggedIn ? {ok:true,user:{name:'MVST Test Office',role}} : {ok:false}, loggedIn ? 200 : 401);
      if (url.pathname === '/api/auth/login') { loggedIn = true; return reply({ok:true,user:{name:'MVST Test Office',role}}); }
      if (url.pathname === '/api/auth/logout') { loggedIn = false; return reply({ok:true}); }
      if (url.pathname === '/api/seva/coordination') {
        coordinationReads++;
        return coordinationFails ? reply({ok:false,error:'Setup temporarily unavailable.'},503) : reply({ok:true,configured:true,delivery:{active:false,message:'WhatsApp is not connected. Automatic messages and driver reply timers are not running.'},settings:{driverReplyTimeoutMinutes:60,groups:{office:[{name:'Test Office Bearer',mobile:'919000000001'}],temple:[{name:'Test Temple Contact',mobile:'919000000002'}],drivers:[{name:'First Test Driver',mobile:'919000000003'},{name:'Second Test Driver',mobile:'919000000004'},{name:'Third Test Driver',mobile:'919000000005'}],poojaBhajan:[{name:'Test Bhajan Head',mobile:'919000000006'}],payment:[{name:'Test Payment Verifier',mobile:'919000000007'}]}}});
      }
      if (url.pathname === '/api/seva/availability') return availabilityFails ? reply({ok:false,error:'Availability temporarily unavailable.'},503) : reply({ok:true,slots: url.searchParams.get('month') === '2026-09' ? [{date:'2026-09-24',preferredSlot:'DAY'},{date:'2026-09-25',preferredSlot:'DAY'},{date:'2026-09-25',preferredSlot:'EVENING'}] : []});
      if (url.pathname === '/api/seva/bookings' && method === 'POST') {
        submissions.push(route.request().postDataJSON());
        return submitFails ? reply({ok:false,error:'Please try again.'},503) : reply({ok:true,booking:{...request,...submissions.at(-1)}});
      }
      if (url.pathname === '/api/seva/booking-status') return statusFails ? reply({ok:false,error:'No booking found for those details.'},404) : reply({ok:true,booking:request});
      if (url.pathname.endsWith('/decision')) { decisions++; return reply({ok:true}); }
      if (url.pathname === '/api/seva/bookings') return reply({ok:true,rows:url.searchParams.get('status') === 'PENDING_APPROVAL' ? [request] : []});
      return reply({ok:true,rows:[],source:'google-api',writeEnabled:true,config:{},pstAdmins:[]});
    });
    const ready = () => page.locator('.seva-calendar[aria-busy="false"]').waitFor();
    const screenshot = name => page.screenshot({path:path.join(output,name),fullPage:true});
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No horizontal page overflow');
    await page.goto(base);
    await page.getByRole('heading',{name:'Bring her blessings into your home.'}).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.portrait-caption .trust-tagline').innerText(),'Mane Manege Vasavi\nMana Manadali Vasavi');
    assert.equal(await page.locator('.seva-site-footer .trust-tagline').innerText(),'Mane Manege Vasavi\nMana Manadali Vasavi');
    await screenshot('seva-home-desktop.png');
    await page.getByRole('button',{name:'Book a Seva',exact:true}).click();
    await ready();
    assert.equal(await page.getByRole('button',{name:'21 September 2026',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'25 September 2026, unavailable',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'24 September 2026, one slot available'}).click();
    assert.equal(await page.getByRole('button',{name:/9:00 am – 2:00 pm/}).isDisabled(),true);
    await page.locator('.seva-slot-picker button[aria-pressed="true"]').filter({hasText:'5:00'}).waitFor();
    assert.equal(await page.getByRole('button',{name:/5:00 pm – 9:00 pm/}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'23 September 2026',exact:true}).click();
    await page.getByRole('button',{name:/9:00 am – 2:00 pm/}).click();
    assert.equal(await page.getByRole('button',{name:/9:00 am – 2:00 pm/}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:/5:00 pm – 9:00 pm/}).click();
    await page.getByLabel('Your name',{exact:true}).fill('Test Family');
    await page.getByLabel('Mobile number',{exact:true}).fill('9000000000');
    await page.getByLabel('Locality / area',{exact:true}).fill('Test area');
    await page.getByLabel('Seva address',{exact:true}).fill('Test address, Bengaluru');
    await screenshot('seva-booking-desktop.png');
    await page.getByRole('button',{name:'Next month'}).click();
    await ready();
    assert.equal(await page.getByRole('button',{name:'Send Seva Request'}).isDisabled(),true);
    assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'Test Family');
    await page.getByRole('button',{name:'Previous month'}).click();
    await ready();
    await page.getByRole('button',{name:'24 September 2026, one slot available'}).click();
    await page.getByRole('button',{name:'Send Seva Request'}).click();
    await page.getByRole('alert').filter({hasText:'Please try again.'}).waitFor();
    submitFails = false;
    await page.getByRole('button',{name:'Send Seva Request'}).click();
    await page.getByText('Request received',{exact:true}).waitFor();
    assert.equal(submissions.at(-1).requestedDate,'2026-09-24');
    assert.equal(submissions.at(-1).preferredSlot,'EVENING');
    await page.getByRole('link',{name:'Go to My Booking'}).click();
    await page.getByLabel('Booking reference').fill('MVST-SEVA-TEST');
    await page.getByLabel('Mobile number',{exact:true}).fill('9000000000');
    await page.getByRole('button',{name:'Check status',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'No booking found'}).waitFor();
    statusFails = false;
    await page.getByRole('button',{name:'Check status',exact:true}).click();
    await page.getByText('PENDING APPROVAL',{exact:true}).waitFor();
    await screenshot('seva-status-desktop.png');
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:844});
      for (const section of ['home','about','gruha-seva','book-seva','upcoming-events','booking-status','contact']) {
        await page.goto(`${base}/#/${section}`);
        await page.locator('.seva-main h1').waitFor();
        if (section === 'book-seva') await ready();
        await noOverflow();
        if (width === 390 && ['home','book-seva','contact'].includes(section)) await screenshot(`seva-${section}-mobile.png`);
      }
    }
    availabilityFails = true;
    await page.goto(`${base}/#/book-seva`);
    await page.getByRole('alert').filter({hasText:'Availability temporarily unavailable.'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'23 September 2026',exact:true}).isDisabled(),true);
    availabilityFails = false;
    await page.getByRole('button',{name:'Try again'}).click();
    await ready();
    assert.equal(await page.getByRole('button',{name:'23 September 2026',exact:true}).isEnabled(),true);
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Open menu',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Close menu',exact:true}).getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Open menu',exact:true}).waitFor();
    await page.getByRole('button',{name:'Office Login',exact:true}).first().click();
    await page.getByRole('heading',{name:'Office Login',exact:true}).waitFor();
    assert.equal(await page.locator('.login-welcome .trust-tagline').innerText(),'Mane Manege Vasavi\nMana Manadali Vasavi');
    await page.getByRole('button',{name:'Show',exact:true}).click();
    assert.equal(await page.getByPlaceholder('••••').getAttribute('type'),'text');
    await screenshot('seva-login-mobile.png');
    await page.getByPlaceholder('Mobile number').fill('9000000000');
    await page.getByPlaceholder('••••').fill('1234');
    await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.getByRole('button',{name:'Open office menu'}).click();
    await page.getByRole('button',{name:'Seva Bookings',exact:true}).click();
    await page.getByRole('heading',{name:'Test Family',exact:true}).waitFor();
    await page.locator('.seva-coordination summary').click();
    await page.getByText('60 minutes per driver',{exact:true}).waitFor();
    await page.getByText('Automatic messaging is not active',{exact:true}).waitFor();
    const drivers = page.locator('.coordination-group').filter({has:page.getByRole('heading',{name:'Driver priority',exact:true})});
    assert.deepEqual(await drivers.locator('li strong').allTextContents(),['First Test Driver','Second Test Driver','Third Test Driver']);
    await page.setViewportSize({width:320,height:844});
    await noOverflow();
    await page.setViewportSize({width:390,height:844});
    await screenshot('seva-coordination-mobile.png');
    await noOverflow();
    await screenshot('seva-office-mobile.png');
    await page.setViewportSize({width:1440,height:1000});
    await screenshot('seva-office-desktop.png');
    page.once('dialog',dialog=>dialog.dismiss());
    await page.getByRole('button',{name:'Approve',exact:true}).click();
    assert.equal(decisions,0,'Cancelling an approval must not approve a booking');
    await page.getByRole('button',{name:'Home',exact:true}).click();
    await page.getByRole('heading',{name:'Registration and collection overview'}).waitFor();
    await screenshot('seva-dashboard-desktop.png');
    coordinationFails = true;
    await page.getByRole('button',{name:'Seva Bookings',exact:true}).click();
    await page.locator('.seva-coordination summary').click();
    await page.getByRole('alert').filter({hasText:'Unable to load booking contact setup.'}).waitFor();
    coordinationFails = false;
    await page.getByRole('button',{name:'Retry contact setup',exact:true}).click();
    await page.getByText('60 minutes per driver',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Logout',exact:true}).click();
    await page.locator('.seva-site').waitFor();
    loggedIn = true; role = 'Volunteer';
    const readsBeforeVolunteer = coordinationReads;
    await page.reload();
    await page.locator('.office-app').waitFor();
    assert.equal(await page.getByRole('button',{name:'Expenses',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Seva Bookings',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'QR Operations',exact:true}).count(),1);
    assert.equal(coordinationReads,readsBeforeVolunteer,'Volunteers must not load private booking contacts');
    assert.deepEqual(errors,[],'No browser runtime exceptions');
    console.log('PASS: public pages at 4 widths; two slots; unavailable/past dates; failed availability & retry; request failure & success; status lookup; menus; login; approval cancellation; Office role gates. All data mocked.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
