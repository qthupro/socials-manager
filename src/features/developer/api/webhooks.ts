/** Webhook endpoint + delivery hooks (docs: guides/webhooks, api-reference/webhooks/*). */
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, toQuery, type ListResponse } from "@/shared/api";

import type {
  CreatedWebhook,
  DeliveryDetail,
  DeliveryPage,
  TestDeliveryResult,
  UpdateWebhookParams,
  WebhookDetail,
  WebhookEndpoint,
  WebhookEventInfo,
} from "./types";

export const webhookKeys = {
  all: ["webhooks"] as const,
  list: ["webhooks", "list"] as const,
  catalog: ["webhooks", "catalog"] as const,
  detail: (id: string) => ["webhooks", "detail", id] as const,
  deliveries: (id: string, status?: string, eventType?: string) =>
    ["webhooks", "deliveries", id, status ?? null, eventType ?? null] as const,
  delivery: (id: string, deliveryId: string) => ["webhooks", "delivery", id, deliveryId] as const,
};

const path = (id: string) => `/webhooks/${encodeURIComponent(id)}`;
const DELIVERY_PAGE = 25;
const POLL_MS = 15_000;

export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.list,
    queryFn: async () => (await api.get<ListResponse<WebhookEndpoint>>("/webhooks")).data ?? [],
  });
}

/** Subscribable event names, grouped by category (posts / inbox / accounts). */
export function useWebhookEventCatalog() {
  return useQuery({
    queryKey: webhookKeys.catalog,
    queryFn: async () =>
      (await api.get<ListResponse<WebhookEventInfo>>("/webhooks/events")).data ?? [],
    staleTime: 60 * 60_000,
  });
}

/** Endpoint with its secret hint and 24h / 7d delivery counts. */
export function useWebhook(id: string | undefined) {
  return useQuery({
    queryKey: webhookKeys.detail(id ?? ""),
    queryFn: () => api.get<WebhookDetail>(path(id!)),
    enabled: !!id,
    refetchInterval: POLL_MS,
  });
}

/** Newest first, cursor-paginated; `count` is the total across pages. */
export function useDeliveries(id: string | undefined, status?: string, eventType?: string) {
  const query = useInfiniteQuery({
    queryKey: webhookKeys.deliveries(id ?? "", status, eventType),
    queryFn: ({ pageParam }) =>
      api.get<DeliveryPage>(
        `${path(id!)}/deliveries${toQuery({
          status,
          event_type: eventType,
          limit: DELIVERY_PAGE,
          cursor: pageParam || undefined,
        })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || undefined,
    enabled: !!id,
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
  const pages = query.data?.pages ?? [];
  return {
    ...query,
    deliveries: pages.flatMap((p) => p.data ?? []),
    total: pages[0]?.count ?? 0,
  };
}

/** One delivery with the exact payload sent and every attempt. */
export function useDelivery(id: string | undefined, deliveryId: string | undefined) {
  return useQuery({
    queryKey: webhookKeys.delivery(id ?? "", deliveryId ?? ""),
    queryFn: () =>
      api.get<DeliveryDetail>(`${path(id!)}/deliveries/${encodeURIComponent(deliveryId!)}`),
    enabled: !!id && !!deliveryId,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 5000 : false),
  });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { url: string; events: string[] }) =>
      api.post<CreatedWebhook>("/webhooks", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateWebhookParams }) =>
      api.patch<WebhookEndpoint>(path(id), patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(path(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

/** Sends `payload` as-is (no wrapping), signed, once — failed tests are not retried. */
export function useTestWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      eventType,
      payload,
    }: {
      id: string;
      eventType: string;
      payload: Record<string, unknown>;
    }) => api.post<TestDeliveryResult>(`${path(id)}/test`, { event_type: eventType, payload }),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: ["webhooks", "deliveries", id] }),
  });
}

/** Creates a NEW delivery (new id, 10 fresh attempts); the original is unchanged. */
export function useRetryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deliveryId }: { id: string; deliveryId: string }) =>
      api.post<DeliveryDetail>(`${path(id)}/deliveries/${encodeURIComponent(deliveryId)}/retry`),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["webhooks", "deliveries", id] });
      qc.invalidateQueries({ queryKey: webhookKeys.detail(id) });
    },
  });
}
