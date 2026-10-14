// Calendar-day helpers in the player's local time zone. Day differences are counted
// on calendar dates, so DST changes (23/25-hour days) and UTC offsets don't skew them.

// 'YYYY-MM-DD' for the local calendar date
export function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Whole calendar days from `from` to `to` (local dates), e.g. yesterday → today is 1
export function daysBetween(from: Date, to: Date) {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

// Parses a 'YYYY-MM-DD' key back into a local Date at midnight
export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
