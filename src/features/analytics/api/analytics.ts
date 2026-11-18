/** Analytics + exports hooks (docs: api-reference/analytics/*, api-reference/exports/*). */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";

import type {
  AnalyticsOverview,
  CreateExportParams,
  ExportItem,
  ExportStatus,
  ExportStatusResponse,
  OverviewParams,
} from "./types";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: (p: OverviewParams) => ["analytics", "overview", p] as const,
  exports: (status?: string) => ["analytics", "exports", status ?? null] as const,
  export: (id: string) => ["analytics", "export", id] as const,
};

/** Reads stored counters only (no platform call, no credits). */
export function useAnalyticsOverview(params: OverviewParams, enabled = true) {
  return useQuery({
    queryKey: analyticsKeys.overview(params),
    enabled,
    queryFn: async () =>
      (await api.get<{ data: AnalyticsOverview }>(`/analytics/overview${toQuery({ ...params })}`))
        .data,
    // Refetch keeps the frame: show the previous range while the new one loads.
    placeholderData: keepPreviousData,
  });
}

const EXPORT_POLL_MS = 5000;
const isRunning = (s: ExportStatus) => s === "pending" || s === "processing";

/** GET /exports — the 50 most recent, polled while one is running. */
export function useExports(status?: string) {
  return useQuery({
    queryKey: analyticsKeys.exports(status),
    queryFn: async () =>
      (await api.get<{ exports: ExportItem[] | null }>(`/exports${toQuery({ status })}`)).exports ??
      [],
    refetchInterval: (q) =>
      q.state.data?.some((e) => isRunning(e.status)) ? EXPORT_POLL_MS : false,
  });
}

/** GET /exports/{id} — carries the result links once completed. */
export function useExport(id: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.export(id ?? ""),
    queryFn: () => api.get<ExportStatusResponse>(`/exports/${encodeURIComponent(id!)}`),
    enabled: !!id,
    refetchInterval: (q) =>
      q.state.data && isRunning(q.state.data.status) ? EXPORT_POLL_MS : false,
  });
}

/** POST /accounts/{id}/export → 202. One export runs at a time; plan allowances apply. */
export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, body }: { accountId: string; body: CreateExportParams }) =>
      api.post<ExportItem>(`/accounts/${encodeURIComponent(accountId)}/export`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: analyticsKeys.all }),
  });
}
