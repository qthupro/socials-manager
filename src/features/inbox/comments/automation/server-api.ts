/**
 * SocialAPI Automations — server-side rules that run 24/7, Instagram & Facebook only
 * (docs: guides/automations, api-reference/automations). Configuring them is free;
 * reply_comment / send_dm cost 1 credit per run, private_reply / hide_comment are free.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, useApiKey } from "@/shared/api";

export type ServerActionType = "hide_comment" | "reply_comment" | "private_reply" | "send_dm";

export interface ServerAction {
  type: ServerActionType;
  reply_comment?: { texts: string[] };
  private_reply?: { texts: string[] };
  send_dm?: { texts: string[] };
}

export interface ServerFilter {
  type: "keyword" | "follows_account";
  keyword?: { keywords: string[]; match: "contains" | "exact" };
}

export interface ServerStep {
  key: string;
  filters?: ServerFilter[];
  actions: ServerAction[];
  buttons?: unknown[];
  fallthrough_step?: string;
}

export interface ServerAutomation {
  id: string;
  account_id: string;
  name: string;
  status: "active" | "paused";
  trigger: "comment" | "dm";
  post_ids?: string[];
  once_per_person: boolean;
  steps: ServerStep[];
  fired_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateServerAutomation {
  account_id: string;
  name: string;
  trigger: "comment";
  once_per_person: boolean;
  steps: ServerStep[];
}

export interface Firing {
  id: string;
  event_id: string;
  person_id: string;
  step_key: string;
  outcomes: { action: ServerActionType; status: "sent" | "failed"; error_code?: string }[] | null;
  created_at: string;
}

export const serverAutomationKeys = {
  all: ["automations"] as const,
  firings: (id: string) => ["automations", "firings", id] as const,
};

export function useServerAutomations() {
  const hasKey = useApiKey((s) => !!s.apiKey);
  return useQuery({
    queryKey: serverAutomationKeys.all,
    queryFn: async () =>
      (await api.get<{ count: number; data: ServerAutomation[] }>("/automations")).data,
    enabled: hasKey,
    staleTime: 60_000,
  });
}

export function useFirings(id: string, enabled: boolean) {
  return useQuery({
    queryKey: serverAutomationKeys.firings(id),
    queryFn: async () =>
      (
        await api.get<{ data: Firing[]; next_cursor: string }>(
          `/automations/${encodeURIComponent(id)}/firings?limit=10`,
        )
      ).data,
    enabled,
  });
}

export function useServerAutomationMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: serverAutomationKeys.all });
  const path = (id: string) => `/automations/${encodeURIComponent(id)}`;

  return {
    create: useMutation({
      mutationFn: (body: CreateServerAutomation) =>
        api.post<ServerAutomation>("/automations", body),
      onSettled: done,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        ...patch
      }: { id: string } & Partial<Omit<CreateServerAutomation, "account_id" | "trigger">> & {
          status?: "active" | "paused";
        }) => api.patch<ServerAutomation>(path(id), patch),
      onSettled: done,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(path(id)),
      onSettled: done,
    }),
  };
}

/** Builds the single-step comment rule this app edits. */
export function buildSteps(input: {
  keywords: string[];
  match: "contains" | "exact";
  replyTexts: string[];
  privateTexts: string[];
  hide: boolean;
}): ServerStep[] {
  const actions: ServerAction[] = [];
  if (input.hide) actions.push({ type: "hide_comment" });
  if (input.replyTexts.length) {
    actions.push({ type: "reply_comment", reply_comment: { texts: input.replyTexts } });
  }
  if (input.privateTexts.length) {
    actions.push({ type: "private_reply", private_reply: { texts: input.privateTexts } });
  }
  return [
    {
      key: "start",
      filters: input.keywords.length
        ? [{ type: "keyword", keyword: { keywords: input.keywords, match: input.match } }]
        : [],
      actions,
    },
  ];
}

/** Reads a rule back into the simple form, or null when it's a multi-step flow built elsewhere. */
export function readSimpleRule(a: ServerAutomation) {
  if (a.trigger !== "comment" || a.steps.length !== 1) return null;
  const step = a.steps[0];
  const kw = step.filters?.find((f) => f.type === "keyword")?.keyword;
  return {
    keywords: kw?.keywords ?? [],
    match: kw?.match ?? "contains",
    replyTexts: step.actions.find((x) => x.type === "reply_comment")?.reply_comment?.texts ?? [],
    privateTexts: step.actions.find((x) => x.type === "private_reply")?.private_reply?.texts ?? [],
    hide: step.actions.some((x) => x.type === "hide_comment"),
  };
}
