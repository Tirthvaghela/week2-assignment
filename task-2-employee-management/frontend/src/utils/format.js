import { DEPARTMENT_HUES, DEPARTMENT_SHORT } from '../constants.js';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// Dates arrive as "YYYY-MM-DD". Adding a local midnight time stops the day
// from shifting across time zones.
const toDate = (isoDate) => new Date(`${isoDate}T00:00:00`);

export const formatSalary = (amount) => rupees.format(amount);

// Short form using Indian units: lakh (L) and crore (Cr).
export function formatCompact(amount) {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  return rupees.format(amount);
}

export const formatDate = (isoDate) =>
  toDate(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatMonth = (isoDate) =>
  toDate(isoDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

// "3 years at company", "7 mo at company", or "Starts Jun 2026" for a future date.
export function formatTenure(isoDate) {
  const AVERAGE_MONTH_MS = 2.63e9;
  const months = Math.floor((Date.now() - toDate(isoDate)) / AVERAGE_MONTH_MS);
  if (months < 0) return `Starts ${formatMonth(isoDate)}`;
  if (months < 1) return 'Joined this month';
  if (months < 12) return `${months} mo at company`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} at company`;
}

export const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

// A department outside the standard list gets a hue worked out from its name,
// so it always has the same colour and different departments rarely share one.
export function departmentHue(department) {
  if (department in DEPARTMENT_HUES) return DEPARTMENT_HUES[department];
  let hash = 0;
  for (const char of department) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return hash;
}

export const shortDepartment = (department) => DEPARTMENT_SHORT[department] || department;

// Inline style that hands a department's hue to the CSS (see --hue in styles.css).
export const hueStyle = (department) => ({ '--hue': departmentHue(department) });
