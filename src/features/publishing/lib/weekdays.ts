import type { Slot, Weekday } from "../api/queues";

export const WEEKDAY_LABEL: Record<Weekday, { short: string; long: string }> = {
  monday: { short: "T2", long: "Thứ 2" },
  tuesday: { short: "T3", long: "Thứ 3" },
  wednesday: { short: "T4", long: "Thứ 4" },
  thursday: { short: "T5", long: "Thứ 5" },
  friday: { short: "T6", long: "Thứ 6" },
  saturday: { short: "T7", long: "Thứ 7" },
  sunday: { short: "CN", long: "Chủ nhật" },
};

/** Monday first, then time — the order the API returns. */
export const sortSlots = (slots: Slot[]) => {
  const order: Weekday[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return [...slots].sort(
    (a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.time.localeCompare(b.time),
  );
};

/** The machine's IANA timezone (default for new Queues). */
export const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** Every IANA timezone the runtime knows (for the picker). */
export function timezones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  return intl.supportedValuesOf?.("timeZone") ?? [localTimezone()];
}
