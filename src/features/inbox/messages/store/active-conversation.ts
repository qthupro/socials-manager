import { create } from "zustand";

/** The conversation currently open in the Messages screen (not persisted). */
export const useActiveConversation = create<{ id: string | null }>(() => ({ id: null }));

export const setActiveConversation = (id: string | null) => useActiveConversation.setState({ id });
