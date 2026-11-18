/**
 * "Sources" a conversation can come from, for the inbox filter and labels.
 * A Facebook account is a login holding several Pages, and every Facebook conversation
 * carries a page_id — so Facebook is listed per Page; other platforms per account.
 */
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { accountPagesQuery, type SocialAccount } from "@/features/connections";
import { getPlatform } from "@/shared/config/platforms";

/** Anything that belongs to an account and maybe a Facebook Page (conversation, post…). */
export interface SourceRef {
  account_id: string;
  page_id?: string;
}

export interface InboxSource {
  /** "acc:<accountId>" or "page:<pageId>" — the filter value. */
  key: string;
  accountId: string;
  pageId?: string;
  name: string;
  picture?: string;
  platform: string;
}

export function useInboxSources(accounts: SocialAccount[]) {
  const facebook = accounts.filter((a) => getPlatform(a.platform)?.slug === "facebook");
  // `combine` keeps a stable array reference while the underlying data is unchanged.
  const pagesData = useQueries({
    queries: facebook.map((a) => accountPagesQuery(a.id)),
    combine: (results) => results.map((r) => r.data),
  });

  return useMemo(() => {
    const sources: InboxSource[] = [];
    for (const a of accounts) {
      const i = facebook.findIndex((f) => f.id === a.id);
      const list = i >= 0 ? pagesData[i]?.filter((p) => p.is_active) : undefined;
      if (list && list.length > 0) {
        for (const p of list) {
          sources.push({
            key: `page:${p.id}`,
            accountId: a.id,
            pageId: p.id,
            name: p.name,
            picture: p.profile_picture_url,
            platform: a.platform,
          });
        }
      } else {
        // Non-Facebook account, or its Pages aren't loaded (yet).
        sources.push({
          key: `acc:${a.id}`,
          accountId: a.id,
          name: a.page_name ?? a.name,
          picture: a.profile_picture_url,
          platform: a.platform,
        });
      }
    }

    const byPage = new Map(sources.filter((s) => s.pageId).map((s) => [s.pageId!, s]));
    const byAccount = new Map(sources.map((s) => [s.accountId, s]));
    /** Where a conversation / post belongs: its Page for Facebook, otherwise its account. */
    const sourceOf = (c: SourceRef): InboxSource | undefined =>
      (c.page_id ? byPage.get(c.page_id) : undefined) ?? byAccount.get(c.account_id);

    return { sources, sourceOf };
    // `facebook` is derived from `accounts`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, pagesData]);
}
