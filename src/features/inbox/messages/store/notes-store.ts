import { createPersistedStore } from "@/shared/lib/storage";

interface NotesState {
  /** Internal note per conversation id — local to this machine, never sent to SocialAPI. */
  notes: Record<string, string>;
  setNote: (conversationId: string, note: string) => void;
}

export const useInboxNotes = createPersistedStore<NotesState>(
  "inbox-notes",
  (set) => ({
    notes: {},
    setNote: (conversationId, note) =>
      set((s) => {
        const notes = { ...s.notes };
        if (note.trim()) notes[conversationId] = note;
        else delete notes[conversationId];
        return { notes };
      }),
  }),
  { version: 1 },
);
