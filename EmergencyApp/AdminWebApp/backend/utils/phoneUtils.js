/**
 * Utility functions for handling Philippine phone numbers consistently across authentication,
 * reporting, and user lookups.
 */

const normalizePhilippinePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (/^9\d{9}$/.test(digits)) {
    return '0' + digits;
  }
  if (/^639\d{9}$/.test(digits)) {
    return '0' + digits.slice(2);
  }
  if (/^09\d{9}$/.test(digits)) {
    return digits;
  }
  return String(phone).replace(/\s|-/g, '').trim();
};

const getPhoneVariants = (phoneInput) => {
  if (!phoneInput) return [];
  const raw = String(phoneInput).trim();
  const digits = raw.replace(/\D/g, '');
  const variants = new Set([raw]);
  if (digits) variants.add(digits);

  if (raw.startsWith('+')) {
    variants.add(raw);
  }

  // 10 digits starting with 9 (e.g. 9353917105)
  if (/^9\d{9}$/.test(digits)) {
    variants.add(digits);
    variants.add('0' + digits);
    variants.add('+63' + digits);
    variants.add('63' + digits);
  }
  // 11 digits starting with 09 (e.g. 09353917105)
  else if (/^09\d{9}$/.test(digits)) {
    const core = digits.slice(1);
    variants.add(digits);
    variants.add(core);
    variants.add('+63' + core);
    variants.add('63' + core);
  }
  // 12 digits starting with 639 (e.g. 639353917105)
  else if (/^639\d{9}$/.test(digits)) {
    const core = digits.slice(2);
    variants.add(digits);
    variants.add('+' + digits);
    variants.add('0' + core);
    variants.add(core);
  } else {
    if (digits.startsWith('0')) {
      variants.add('+63' + digits.slice(1));
      variants.add(digits.slice(1));
    }
    if (raw.startsWith('+63')) {
      variants.add('0' + raw.slice(3));
      variants.add(raw.slice(3));
    }
  }

  return Array.from(variants).filter(Boolean);
};

module.exports = {
  normalizePhilippinePhone,
  getPhoneVariants,
};
