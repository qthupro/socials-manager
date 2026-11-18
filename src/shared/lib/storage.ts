import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist, type PersistOptions } from "zustand/middleware";

/**
 * Every key this app writes to localStorage starts with this prefix,
 * so we can later find (backup / reset) exactly our data and nothing else.
 */
export const STORAGE_PREFIX = "social-manager:";

export const storageKey = (name: string) => `${STORAGE_PREFIX}${name}`;

/** Removes everything this app saved on the machine (keys, settings, bots, notes…). */
export function clearAppStorage() {
  const ours = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
  for (const key of ours) localStorage.removeItem(key);
}

type PersistedStoreOptions<T, P> = Omit<PersistOptions<T, P>, "name" | "storage"> & {
  /**
   * Bump this whenever the persisted shape changes and handle the old
   * shape in `migrate`. Never change a shape without bumping it.
   */
  version: number;
};

/**
 * Create a zustand store persisted to localStorage under `social-manager:<name>`.
 * Each feature owns its own store (own key + version), so features evolve independently.
 *
 * @example
 * export const useNotesStore = createPersistedStore<NotesState>(
 *   "notes",
 *   (set) => ({ notes: [], add: (n) => set((s) => ({ notes: [...s.notes, n] })) }),
 *   { version: 1 },
 * );
 */
export function createPersistedStore<T, P = T>(
  name: string,
  initializer: StateCreator<T, [["zustand/persist", unknown]]>,
  options: PersistedStoreOptions<T, P>,
) {
  return create<T>()(
    persist(initializer, {
      name: storageKey(name),
      storage: createJSONStorage(() => localStorage),
      ...options,
    }),
  );
}
