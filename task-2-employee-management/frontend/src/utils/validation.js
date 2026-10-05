// Form validation. These rules mirror backend/models/employee.py, which is
// the authority: the API re-checks everything that is sent to it.

export const FIELDS = ['name', 'department', 'role', 'salary', 'joinDate'];
export const MAX_SALARY = 100_000_000;
export const EARLIEST_JOIN_DATE = '1970-01-01';

const toIsoDate = (date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');

export function latestJoinDate() {
  const date = new Date();
  date.setDate(date.getDate() + 365);
  return toIsoDate(date);
}

const cleanText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function validateText(value, min, max, label) {
  const text = cleanText(value);
  if (!text) return `${label} is required.`;
  if (text.length < min || text.length > max) return `${label} must be ${min} to ${max} characters.`;
  if (!/\p{L}/u.test(text)) return `${label} must contain a letter.`;
  return '';
}

function validateSalary(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Salary is required.';
  const amount = Number(text);
  if (!(amount > 0)) return 'Salary must be greater than 0.';
  if (amount > MAX_SALARY) return 'Salary must be at most 100,000,000.';
  return '';
}

function validateJoinDate(value) {
  if (!value) return 'Join date is required.';
  if (!isRealDate(value)) return 'Enter a valid date.';
  if (value < EARLIEST_JOIN_DATE || value > latestJoinDate()) {
    return 'Join date must be between 1970 and one year from today.';
  }
  return '';
}

// Returns an object of field -> message containing only the invalid fields.
export function validateEmployee(values) {
  const messages = {
    name: validateText(values.name, 2, 80, 'Name'),
    department: values.department ? '' : 'Choose a department.',
    role: validateText(values.role, 2, 80, 'Role'),
    salary: validateSalary(values.salary),
    joinDate: validateJoinDate(values.joinDate),
  };
  return Object.fromEntries(Object.entries(messages).filter(([, message]) => message));
}

// Converts form values (all strings) into the JSON body the API expects.
export function toPayload(values) {
  return {
    name: cleanText(values.name),
    department: values.department,
    role: cleanText(values.role),
    salary: Number(String(values.salary).trim()),
    joinDate: values.joinDate,
  };
}
