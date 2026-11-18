const compact = new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("vi-VN");

/** 1.284 / 12,9 N / 4,2 Tr */
export const fmtCompact = (n: number) => compact.format(n);
export const fmtFull = (n: number) => full.format(n);

/** "2026-11-03" → "03/11". */
export const shortDay = (day: string) => day.slice(8, 10) + "/" + day.slice(5, 7);

/** "2026-11-03" → "03/11/2026". */
export const dmy = (day: string) => day.split("-").reverse().join("/");

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();
