export const SEVA_COORDINATION_ID = 'gruha-seva';
export const SEVA_CONTACT_GROUPS = ['temple', 'drivers', 'poojaBhajan', 'office', 'payment'];

// Contacts live in the private database, never in the public frontend bundle.
export function validateSevaCoordination(input) {
  if (!input || typeof input !== 'object') throw new Error('Contact setup is required.');
  const timeout = input.driverReplyTimeoutMinutes;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 1440) {
    throw new Error('Driver reply time must be between 1 and 1440 minutes.');
  }
  const groups = {};
  for (const key of SEVA_CONTACT_GROUPS) {
    const contacts = input.groups?.[key];
    if (!Array.isArray(contacts) || contacts.length < 1 || contacts.length > 10) {
      throw new Error(`Add between 1 and 10 contacts for ${key}.`);
    }
    const seen = new Set();
    groups[key] = contacts.map((contact) => {
      const name = typeof contact?.name === 'string' ? contact.name.trim().replace(/\s+/g, ' ') : '';
      const rawMobile = typeof contact?.mobile === 'string' ? contact.mobile.trim() : '';
      if (!name || name.length > 100 || !/^\+?[\d\s()-]+$/.test(rawMobile)) {
        throw new Error(`A valid name and Indian mobile number are required for ${key}.`);
      }
      const digits = rawMobile.replace(/\D/g, '');
      const mobile = digits.length === 10 ? `91${digits}` : digits;
      if (!/^91[6-9]\d{9}$/.test(mobile) || seen.has(mobile)) {
        throw new Error(`Invalid or repeated mobile number in ${key}.`);
      }
      seen.add(mobile);
      return { name, mobile };
    });
  }
  return { groups, driverReplyTimeoutMinutes: timeout };
}

export function coordinationResponse(settings) {
  return {
    ok: true,
    configured: Boolean(settings),
    settings: settings ? {
      ...validateSevaCoordination(settings),
      updatedAt: settings.updatedAt,
    } : null,
    // Saving recipients cannot activate delivery. This changes only when a real
    // provider, approved templates, callbacks and durable scheduler are wired.
    delivery: {
      active: false,
      status: 'SETUP_REQUIRED',
      message: 'WhatsApp is not connected. Automatic messages and driver reply timers are not running.',
    },
  };
}
