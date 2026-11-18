export interface PostFilters {
  accountId?: string;
  pageId?: string;
  /** Only posts with at least one comment. */
  withComments: boolean;
}

/** All under ["inbox", …] so realtime comment events refresh them. */
export const commentKeys = {
  all: ["inbox", "comments"] as const,
  posts: (f: PostFilters) => ["inbox", "comments", "posts", f] as const,
  list: (postId: string) => ["inbox", "comments", "list", postId] as const,
  replies: (postId: string, commentId?: string) =>
    commentId
      ? (["inbox", "comments", "replies", postId, commentId] as const)
      : (["inbox", "comments", "replies", postId] as const),
  metrics: (postId: string) => ["inbox", "comments", "metrics", postId] as const,
};
