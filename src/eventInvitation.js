export const DEFAULT_TRUSTEE_MESSAGE = `🙏 Jai Vasavi 🙏

Dear {{Name}},

*Special Greetings to Our Esteemed Members!*

It is with immense pleasure and heartfelt respect that we cordially invite you to grace the auspicious occasion of the *4th Samoohika Shastipoorthi Shanti* and *2nd Bheemaratha Shanti ceremony*.

Your esteemed presence will be a great honor and will add to the sanctity and joy of this sacred celebration. We would be truly delighted to have you join us and make this occasion even more memorable with your gracious presence and blessings.

📅 *Date:* Sunday, 2nd August 2026
📍 *Venue:* Shubh Convention Hall, J.P. Nagar, Bengaluru

We sincerely look forward to welcoming you and celebrating this auspicious occasion together.

*Note:* The Registration Committee will be available at the entrance. Kindly sign the attendance register and collect your food coupon upon arrival.

*Registration Committee:*
📞 *Contact:*
Ashoka T N - 9449653053
Kedarnath M.N - 95350 56868

With Warm Regards
*Manemanege Vasavi Seva Trust (R.)*
Bengaluru
On behalf of the Organizing Committee`;

export const DEFAULT_DONOR_INVITATION_MESSAGE = DEFAULT_TRUSTEE_MESSAGE.replace(
  '*Special Greetings to Our Esteemed Members!*',
  '*Special Greetings to Our Esteemed Donors!*',
).replace(
  'Kindly sign the attendance register and collect your food coupon upon arrival.',
  'Kindly collect your food coupon upon arrival.',
);

export function buildEventInvitationMessage(recipientName, template = DEFAULT_TRUSTEE_MESSAGE) {
  const personalizedName = recipientName || 'Esteemed Member';
  return String(template || DEFAULT_TRUSTEE_MESSAGE)
    .replaceAll('{{Name}}', personalizedName)
    .replaceAll('{{name}}', personalizedName);
}
