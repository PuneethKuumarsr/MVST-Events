const EVENT_DATE = 'Sunday, 02-Aug-2026';
const ICONS = {
  foldedHands: '\u{1F64F}',
  calendar: '\u{1F4C5}',
  moneyBag: '\u{1F4B0}',
  gift: '\u{1F381}',
  diya: '\u{1FA94}',
  check: '\u2705',
  yellowCircle: '\u{1F7E1}',
};

const EVENT_TEMPLATES = {
  shashtipoorthi: {
    eventName: 'Samoohika Shashtipoorthi Shanthi',
    bookingFee: 30000,
    kitItems: [
      'Saree',
      'Dhoti-Shalya',
      'Gold Mangalya Bottu (to be given on the event day)',
      'One Framed Couple Photo',
      'Madilakki / Odibhiyyam',
      '10 Food Coupons per Couple',
      'Breakfast & Lunch',
    ],
    rituals: [
      'Gangapooja',
      'Gopooja',
      'Kalasha Pooja',
      'Homa',
      'Harathi',
      'Samprokshana with Silver Jaradi',
      'Mangalya Dharane',
    ],
  },
  bhimaratha: {
    eventName: 'Samoohika Bhimaratha Shanthi',
    bookingFee: 20000,
    kitItems: [
      'Saree',
      'Dhoti-Shalya',
      'One Framed Couple Photo',
      'Madilakki / Odibhiyyam',
      '10 Food Coupons per Couple',
      'Breakfast & Lunch',
    ],
    rituals: [
      'Gangapooja',
      'Gopooja',
      'Kalasha Pooja',
      'Homa',
      'Harathi',
      'Samprokshana with Silver Jaradi',
    ],
  },
};

export function formatIndianRupees(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function coupleName(participant) {
  const husbandName = String(participant.groomName || '').trim() || 'Respected Sir';
  const wifeName = String(participant.brideName || '').trim();
  return wifeName ? husbandName + ' & ' + wifeName : husbandName;
}

function templateFor(participant) {
  return EVENT_TEMPLATES[participant.eventType] || EVENT_TEMPLATES.shashtipoorthi;
}

function bulletLines(items) {
  return items.map((item) => '\u2022 ' + item);
}

export function buildWelcomeMessage(participant) {
  const template = templateFor(participant);
  return [
    ICONS.foldedHands + ' *Namaskara ' + coupleName(participant) + '*',
    '',
    'Thank you for registering for the *' + template.eventName + '*.',
    '',
    ICONS.calendar + ' *Event Date:* ' + EVENT_DATE,
    ICONS.moneyBag + ' *Booking Fee:* ' + formatIndianRupees(template.bookingFee) + ' per couple',
    '',
    ICONS.gift + ' *KIT Includes:*',
    ...bulletLines(template.kitItems),
    '',
    ICONS.diya + ' *Rituals Include:*',
    ...bulletLines(template.rituals),
    '',
    'We look forward to your participation in this auspicious event.',
    '',
    ICONS.foldedHands + ' Regards',
    '*Manemanege Vasavi Seva Trust (R)* & Team',
  ].join('\n');
}

export function buildPaymentConfirmationMessage(participant) {
  const template = templateFor(participant);
  const amountReceived = formatIndianRupees(participant.paidAmount || 0);
  const balanceAmount = Math.max(Number(participant.balance || 0), 0);
  const isPartialPayment =
    participant.paymentStatus === 'Part Paid' ||
    (participant.paymentStatus !== 'Full Paid' && balanceAmount > 0);

  if (!isPartialPayment) {
    return [
      ICONS.foldedHands + ' *Namaskara ' + coupleName(participant) + '*',
      '',
      ICONS.check + ' *Registration Confirmed*',
      '',
      'We are pleased to confirm receipt of *' + amountReceived + '* towards the *' + template.eventName + '*.',
      '',
      ICONS.calendar + ' *Event Date:* ' + EVENT_DATE,
      '',
      'Further details regarding KIT distribution, event schedule and reporting instructions will be shared closer to the event date.',
      '',
      'We look forward to your participation in this auspicious occasion.',
      '',
      ICONS.foldedHands + ' Regards',
      '*Manemanege Vasavi Seva Trust (R)* & Team',
    ].join('\n');
  }

  return [
    ICONS.foldedHands + ' *Namaskara ' + coupleName(participant) + '*',
    '',
    ICONS.yellowCircle + ' *Registration Under Process*',
    '',
    'We are pleased to confirm receipt of *' + amountReceived + '* towards the *' + template.eventName + '*.',
    '',
    ICONS.moneyBag + ' *Balance Amount Payable:* ' + formatIndianRupees(balanceAmount),
    '',
    'Kindly complete the remaining contribution amount at your earliest convenience to confirm your registration.',
    '',
    ICONS.calendar + ' *Event Date:* ' + EVENT_DATE,
    '',
    'Further details regarding KIT distribution, event schedule and reporting instructions will be shared closer to the event date.',
    '',
    'We look forward to your participation in this auspicious occasion.',
    '',
    ICONS.foldedHands + ' Regards',
    '*Manemanege Vasavi Seva Trust (R)* & Team',
  ].join('\n');
}

export function normalizeWhatsAppMessage(message) {
  return String(message || '').replace(/\r\n?/g, '\n');
}

export function encodeWhatsAppMessage(message) {
  return encodeURIComponent(normalizeWhatsAppMessage(message));
}

export function buildKitMessage(participant) {
  const template = templateFor(participant);
  return [
    'Namaskara ' + coupleName(participant) + '.',
    'KIT distribution for *' + template.eventName + '* includes all applicable items for your event:',
    ...bulletLines(template.kitItems),
    'Please keep your registration details handy.',
    '*Manemanege Vasavi Seva Trust (R)* & Team',
  ].join('\n');
}

export function buildWhatsAppMessage(participant, kind) {
  if (kind === 'welcome') return buildWelcomeMessage(participant);
  if (kind === 'confirmation' || kind === 'balance') return buildPaymentConfirmationMessage(participant);
  if (kind === 'kit') return buildKitMessage(participant);
  return '';
}

export const buildShashtipoorthiWelcomeMessage = buildWelcomeMessage;
export const buildShashtipoorthiPaymentMessage = buildPaymentConfirmationMessage;
