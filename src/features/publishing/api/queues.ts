/**
 * SocialAPI Queues (docs: api-reference/queues/*). A Queue is a weekly set of posting
 * times for one Brand; a post created with queue_id takes the earliest free time.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";

import { postKeys } from "./posts";

export type Weekday =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const WEEKDAYS: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** "HH:MM", 24-hour, in the Queue's timezone. */
export interface Slot {
  day: Weekday;
  time: string;
}

export interface Queue {
  id: string;
  brand_id: string;
  name: string;
  /** IANA timezone the slots are expressed in. */
  timezone: string;
  /** Sorted Monday first, then time. */
  slots: Slot[] | null;
  /** What queue_id: "default" refers to; a Brand always has exactly one. */
  is_default: boolean;
  /** False when paused: no new post can join it. */
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateQueueParams {
  brand_id: string;
  name: string;
  timezone: string;
  /** 1 to 100 weekly times. */
  slots: Slot[];
  active?: boolean;
  is_default?: boolean;
}

export interface UpdateQueueParams {
  name?: string;
  timezone?: string;
  /** Replaces the whole list. */
  slots?: Slot[];
  active?: boolean;
  /** Only true is accepted. */
  is_default?: true;
  /** Move the Queue's posts onto the new slots, keeping their order. */
  reshuffle_existing?: boolean;
}

/** One upcoming free time (preview is a forecast, not a reservation). */
export interface QueuedTime {
  day: Weekday;
  slot_time: string;
  /** RFC 3339 with the Queue's local offset. */
  time: string;
}

/** A Brand holds at most 20 Queues. */
export const MAX_QUEUES_PER_BRAND = 20;
export const MAX_SLOTS = 100;

const path = (id: string) => `/queues/${encodeURIComponent(id)}`;

export const queueKeys = {
  all: ["queues"] as const,
  list: (brandId?: string) => ["queues", "list", brandId ?? null] as const,
  preview: (id: string, count: number) => ["queues", "preview", id, count] as const,
};

/** GET /queues — grouped by Brand, oldest first; not paginated. */
export function useQueues(brandId?: string) {
  return useQuery({
    queryKey: queueKeys.list(brandId),
    queryFn: async () =>
      (await api.get<{ count: number; data: Queue[] }>(`/queues${toQuery({ brand_id: brandId })}`))
        .data ?? [],
  });
}

/** GET /queues/{id}/preview — the next free times, soonest first (works when paused). */
export function useQueuePreview(id: string | undefined, count = 10) {
  return useQuery({
    queryKey: queueKeys.preview(id ?? "", count),
    queryFn: async () =>
      (await api.get<{ data: QueuedTime[] | null }>(`${path(id!)}/preview?count=${count}`)).data ??
      [],
    enabled: !!id,
    staleTime: 60_000,
  });
}

function useQueueMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queueKeys.all });
      // Reshuffle / delete change the posts' queue_id or times.
      qc.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export const useCreateQueue = () =>
  useQueueMutation((body: CreateQueueParams) => api.post<Queue>("/queues", body));

export const useUpdateQueue = () =>
  useQueueMutation(({ id, body }: { id: string; body: UpdateQueueParams }) =>
    api.patch<Queue & { reshuffled_count?: number }>(path(id), body),
  );

/** Queued posts keep their times and leave the Queue; the oldest remaining becomes default. */
export const useDeleteQueue = () =>
  useQueueMutation((id: string) =>
    api.delete<{ deleted: boolean; id: string; released_count: number }>(path(id)),
  );
