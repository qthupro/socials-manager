/** Unified event log hooks (docs: api-reference/events/*). Needs analytics:read. */
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";

import type { EventsFilter, EventsPage, EventsSummary } from "./types";

export const eventKeys = {
  all: ["dev-events"] as const,
  list: (f: EventsFilter) => ["dev-events", "list", f] as const,
  summary: (from?: string, to?: string) =>
    ["dev-events", "summary", from ?? null, to ?? null] as const,
};

const PAGE_SIZE = 50;

export function useEvents(filter: EventsFilter) {
  const query = useInfiniteQuery({
    queryKey: eventKeys.list(filter),
    queryFn: ({ pageParam }) =>
      api.get<EventsPage>(
        `/events${toQuery({ ...filter, limit: PAGE_SIZE, cursor: pageParam || undefined })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.pagination.has_more && last.pagination.next_cursor
        ? last.pagination.next_cursor
        : undefined,
    placeholderData: keepPreviousData,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    events: pages.flatMap((p) => p.events ?? []),
    retentionDays: pages[0]?.retention_days,
  };
}

/** Totals, failures and breakdowns for the window (plus the previous window's total). */
export function useEventsSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: eventKeys.summary(from, to),
    queryFn: () => api.get<EventsSummary>(`/events/summary${toQuery({ from, to })}`),
    placeholderData: keepPreviousData,
  });
}
