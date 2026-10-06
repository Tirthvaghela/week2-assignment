const pad = (number) => String(number).padStart(2, '0');

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Seconds as "MM:SS", e.g. 3252 -> "54:12".
export function formatCountdown(seconds) {
  const safe = Math.max(0, seconds);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

// "Today, 09:42", "Tomorrow, 00:12" or "12 Mar, 09:42".
export function formatDayTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  let day = dayMonth.format(date);
  if (sameDay(date, now)) day = 'Today';
  else if (sameDay(date, tomorrow)) day = 'Tomorrow';
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const isToday = (isoString) => sameDay(new Date(isoString), new Date());

// "Today" or "12 Mar 2026".
export const formatCreated = (isoString) => (isToday(isoString) ? 'Today' : dayMonthYear.format(new Date(isoString)));

// First part of a username, capitalised: "dana.ruiz" -> "Dana".
export function firstName(username) {
  const first = username.split(/[._]/).find(Boolean) || username;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Short display form of the database id: "HB-7F3A-92C1".
export function formatUserId(id) {
  const tail = id.slice(-8).toUpperCase();
  return `HB-${tail.slice(0, 4)}-${tail.slice(4)}`;
}
