export const VOICE_INVITATION_LANGUAGE_OPTIONS = [
  { value: 'en-IN', label: 'English' },
  { value: 'kn-IN', label: 'Kannada' },
  { value: 'bilingual', label: 'Kannada + English' },
];

const EVENT_DETAILS = {
  date: 'Sunday, 2 August 2026',
  venue: 'Shubh Convention Hall, J. P. Nagar, Bengaluru',
};

function safeRecipientName(value) {
  return String(value || '').trim() || 'Esteemed Guest';
}

export function buildVoiceInvitationSegments(recipientName, language = 'en-IN') {
  const name = safeRecipientName(recipientName);
  const english = {
    lang: 'en-IN',
    text: [
      'Jai Vasavi.',
      `Namaskara ${name}.`,
      'I am the AI invitation assistant speaking on behalf of Manemanege Vasavi Seva Trust.',
      `We cordially invite you to the fourth Samoohika Shastipoorthi Shanti and second Bheemaratha Shanti ceremony on ${EVENT_DETAILS.date}, at ${EVENT_DETAILS.venue}.`,
      'Will you be attending the programme?',
      'Please say yes, no, or call me later.',
    ].join(' '),
  };
  const kannada = {
    lang: 'kn-IN',
    text: [
      'ಜೈ ವಾಸವಿ.',
      `ನಮಸ್ಕಾರ ${name} ಅವರೇ.`,
      'ನಾನು ಮನೆಮನೆಗೆ ವಾಸವಿ ಸೇವಾ ಟ್ರಸ್ಟ್ ಪರವಾಗಿ ಮಾತನಾಡುತ್ತಿರುವ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆಯ ಆಹ್ವಾನ ಸಹಾಯಕ.',
      'ಭಾನುವಾರ, ಎರಡು ಆಗಸ್ಟ್ ಎರಡು ಸಾವಿರದ ಇಪ್ಪತ್ತಾರರಂದು, ಬೆಂಗಳೂರಿನ ಜೆ. ಪಿ. ನಗರದಲ್ಲಿರುವ ಶುಭ್ ಕನ್ವೆನ್ಷನ್ ಹಾಲ್‌ನಲ್ಲಿ ನಡೆಯುವ ನಾಲ್ಕನೇ ಸಾಮೂಹಿಕ ಷಷ್ಟಿಪೂರ್ತಿ ಶಾಂತಿ ಮತ್ತು ಎರಡನೇ ಭೀಮರಥ ಶಾಂತಿ ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ನಿಮ್ಮನ್ನು ಆತ್ಮೀಯವಾಗಿ ಆಹ್ವಾನಿಸುತ್ತಿದ್ದೇವೆ.',
      'ನೀವು ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಆಗಮಿಸುತ್ತೀರಾ?',
      'ದಯವಿಟ್ಟು ಹೌದು, ಇಲ್ಲ, ಅಥವಾ ನಂತರ ಕರೆ ಮಾಡಿ ಎಂದು ತಿಳಿಸಿ.',
    ].join(' '),
  };

  if (language === 'kn-IN') return [kannada];
  if (language === 'bilingual') return [kannada, english];
  return [english];
}

export function buildVoiceInvitationScript(recipientName, language = 'en-IN') {
  return buildVoiceInvitationSegments(recipientName, language)
    .map((segment) => segment.text)
    .join('\n\n');
}

function normalizedTranscript(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function includesAny(value, phrases) {
  return phrases.some((phrase) => value.includes(phrase));
}

export function classifyVoiceRsvp(transcript) {
  const response = normalizedTranscript(transcript);
  if (!response) return 'Needs Follow-up';

  if (includesAny(response, [
    'call later',
    'call me later',
    'call back',
    'another time',
    'i am busy',
    'later please',
    'ನಂತರ ಕರೆ',
    'ಮತ್ತೆ ಕರೆ',
    'ಈಗ ಬ್ಯುಸಿ',
    'ಆಮೇಲೆ',
    'nantara kare',
    'amele',
  ])) return 'Call Later';

  if (includesAny(response, [
    'not sure',
    'maybe',
    'need to check',
    'will confirm',
    'have a question',
    'some questions',
    'ಗೊತ್ತಿಲ್ಲ',
    'ಖಚಿತವಿಲ್ಲ',
    'ತಿಳಿಸುತ್ತೇನೆ',
    'gotilla',
    'khachitavilla',
  ])) return 'Needs Follow-up';

  if (includesAny(response, [
    'not attending',
    'not coming',
    'cannot attend',
    'can not attend',
    'unable to attend',
    "won't attend",
    'will not attend',
    'no i',
    'sorry no',
    'ಬರುವುದಿಲ್ಲ',
    'ಬರಲು ಸಾಧ್ಯವಿಲ್ಲ',
    'ಆಗುವುದಿಲ್ಲ',
    'ಇಲ್ಲ',
    'baralla',
    'illa',
  ]) || response === 'no') return 'Not Attending';

  if (includesAny(response, [
    'yes',
    'attending',
    'will attend',
    'will come',
    'definitely',
    'sure',
    'coming',
    'ಹೌದು',
    'ಬರುತ್ತೇನೆ',
    'ಬರುತ್ತೇವೆ',
    'ಆಗಮಿಸುತ್ತೇನೆ',
    'bartini',
    'barutteve',
    'haudu',
  ])) return 'Attending';

  return 'Needs Follow-up';
}

export function voiceRsvpAcknowledgement(status, language = 'en-IN') {
  const english = {
    Attending: 'Thank you. Your attendance is noted. We look forward to welcoming you. Jai Vasavi.',
    'Not Attending': 'Thank you for letting us know. Jai Vasavi.',
    'Call Later': 'Certainly. We have noted that you would like a call later. Jai Vasavi.',
    'Needs Follow-up': 'Thank you. A committee member will follow up with you. Jai Vasavi.',
  };
  const kannada = {
    Attending: 'ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಆಗಮನವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ. ಜೈ ವಾಸವಿ.',
    'Not Attending': 'ತಿಳಿಸಿದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಜೈ ವಾಸವಿ.',
    'Call Later': 'ಖಂಡಿತ. ನಂತರ ಕರೆ ಮಾಡಲು ದಾಖಲಿಸಲಾಗಿದೆ. ಜೈ ವಾಸವಿ.',
    'Needs Follow-up': 'ಧನ್ಯವಾದಗಳು. ಸಮಿತಿಯ ಸದಸ್ಯರು ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತಾರೆ. ಜೈ ವಾಸವಿ.',
  };
  return language === 'kn-IN' || language === 'bilingual'
    ? kannada[status] || kannada['Needs Follow-up']
    : english[status] || english['Needs Follow-up'];
}
