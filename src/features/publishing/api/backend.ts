/** SocialAPI /posts endpoints (docs: api-reference/posts, guides/publishing). */
import { api, toQuery, type CursorPage } from "@/shared/api";

import type {
  CreatePostRequest,
  Post,
  PostListParams,
  UpdatePostRequest,
  ValidatePostResponse,
} from "./types";

const path = (id: string) => `/posts/${encodeURIComponent(id)}`;

export const postsBackend = {
  list: (params: PostListParams) => api.get<CursorPage<Post>>(`/posts${toQuery({ ...params })}`),
  get: (id: string) => api.get<Post>(path(id)),
  /**
   * 201 draft / scheduled / publishing; 207 partial. A 422 whose body is the post itself
   * (every target failed right away) surfaces as ApiError code "http.422" — the post exists.
   */
  create: (body: CreatePostRequest) => api.post<Post>("/posts", body),
  /** Draft, scheduled or failed posts only. Sending targets replaces them. */
  update: (id: string, body: UpdatePostRequest) => api.patch<Post>(path(id), body),
  /** Scheduled → cancelled; published → platform copies deleted too. */
  remove: (id: string) => api.delete<{ success: boolean }>(path(id)),
  /** Draft or scheduled → publishing now (1 credit). */
  publish: (id: string) => api.post<Post>(`${path(id)}/publish`),
  /** Re-sends only the failed targets (1 credit). */
  retry: (id: string) => api.post<{ success: boolean }>(`${path(id)}/retry`),
  /** Removes the copies from the platforms; account_id limits it to one target. */
  unpublish: (id: string, accountId?: string) =>
    api.post<{ success: boolean }>(
      `${path(id)}/unpublish`,
      accountId ? { account_id: accountId } : {},
    ),
  /** Free dry run: { valid, errors, warnings } per platform / target. */
  validate: (body: CreatePostRequest) => api.post<ValidatePostResponse>("/posts/validate", body),
};
