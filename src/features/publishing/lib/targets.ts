/**
 * Where a post can go: one entry per account, except Facebook which is one per active
 * Page (targets need page_id when the account holds several Pages).
 */
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { accountPagesQuery, type SocialAccount } from "@/features/connections";
import { getPlatform } from "@/shared/config/platforms";

export interface TargetOption {
  /** "acc:<accountId>" or "page:<pageId>". */
  key: string;
  accountId: string;
  pageId?: string;
  name: string;
  picture?: string;
  platform: string;
  brandId: string;
}

export const targetKey = (t: { account_id?: string; page_id?: string }) =>
  t.page_id ? `page:${t.page_id}` : `acc:${t.account_id}`;

export function useTargetOptions(accounts: SocialAccount[]) {
  const facebook = accounts.filter((a) => getPlatform(a.platform)?.slug === "facebook");
  const pagesData = useQueries({
    queries: facebook.map((a) => accountPagesQuery(a.id)),
    combine: (results) => results.map((r) => r.data),
  });

  return useMemo(() => {
    const options: TargetOption[] = [];
    for (const a of accounts) {
      const i = facebook.findIndex((f) => f.id === a.id);
      const pages = i >= 0 ? pagesData[i]?.filter((p) => p.is_active) : undefined;
      if (pages && pages.length > 0) {
        for (const p of pages) {
          options.push({
            key: `page:${p.id}`,
            accountId: a.id,
            pageId: p.id,
            name: p.name,
            picture: p.profile_picture_url,
            platform: a.platform,
            brandId: a.brand_id,
          });
        }
      } else {
        options.push({
          key: `acc:${a.id}`,
          accountId: a.id,
          name: a.page_name ?? a.name,
          picture: a.profile_picture_url,
          platform: a.platform,
          brandId: a.brand_id,
        });
      }
    }
    const byKey = new Map(options.map((o) => [o.key, o]));
    const byAccount = new Map(options.map((o) => [o.accountId, o]));
    /** Option for a post target (its Page for Facebook, otherwise its account). */
    const optionOf = (t: { account_id?: string; page_id?: string }) =>
      byKey.get(targetKey(t)) ?? (t.account_id ? byAccount.get(t.account_id) : undefined);
    return { options, optionOf };
    // `facebook` is derived from `accounts`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, pagesData]);
}
