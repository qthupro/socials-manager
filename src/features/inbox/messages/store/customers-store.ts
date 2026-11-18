import { createPersistedStore } from "@/shared/lib/storage";

/** What the shop records about a customer — local to this machine, never sent to SocialAPI. */
export interface CustomerInfo {
  /** Shown instead of the platform name when set. */
  name?: string;
  phone?: string;
  /** Zalo number / link (often the same as the phone). */
  zalo?: string;
  email?: string;
  address?: string;
  /** About the customer (follows them across conversations; the conversation note doesn't). */
  note?: string;
  updatedAt?: string;
}

export const CUSTOMER_FIELDS = ["name", "phone", "zalo", "email", "address", "note"] as const;

interface CustomersState {
  /** Keyed by customerKey() — the same person keeps their info in every conversation. */
  customers: Record<string, CustomerInfo>;
  save: (key: string, info: CustomerInfo) => void;
  /** Fills only empty fields (used by the bot: never overwrites what a human typed). */
  fillIn: (key: string, info: CustomerInfo) => CustomerInfo;
}

export const useCustomers = createPersistedStore<CustomersState>(
  "inbox-customers",
  (set) => ({
    customers: {},
    save: (key, info) =>
      set((s) => {
        const clean: CustomerInfo = {};
        for (const f of CUSTOMER_FIELDS) {
          const v = info[f]?.trim();
          if (v) clean[f] = v;
        }
        const customers = { ...s.customers };
        if (Object.keys(clean).length === 0) delete customers[key];
        else customers[key] = { ...clean, updatedAt: new Date().toISOString() };
        return { customers };
      }),
    fillIn: (key, info) => {
      const prev = useCustomers.getState().customers[key] ?? {};
      const added: CustomerInfo = {};
      for (const f of CUSTOMER_FIELDS) {
        const v = info[f]?.trim();
        if (v && !prev[f]) added[f] = v;
      }
      if (Object.keys(added).length) {
        set((s) => ({
          customers: {
            ...s.customers,
            [key]: { ...prev, ...added, updatedAt: new Date().toISOString() },
          },
        }));
      }
      return added;
    },
  }),
  { version: 1 },
);
