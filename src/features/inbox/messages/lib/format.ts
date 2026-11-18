const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAYS_LONG = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (iso: string) =>
  Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Conversation list: 14:05 · Hôm qua · T3 · 02/11 */
export function formatListTime(iso: string) {
  const days = daysAgo(iso);
  const d = new Date(iso);
  if (days === 0) return formatTime(iso);
  if (days === 1) return "Hôm qua";
  if (days < 7) return WEEKDAYS[d.getDay()];
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Day separator in the thread: Hôm nay · Hôm qua · Thứ Hai, 16/11 */
export function formatDayLabel(iso: string) {
  const days = daysAgo(iso);
  const d = new Date(iso);
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${WEEKDAYS_LONG[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export const isSameDay = (a: string, b: string) =>
  startOfDay(new Date(a)) === startOfDay(new Date(b));

export const minutesBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;

export const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;
