import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plug } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

import { useAccounts, useBrands } from "@/features/connections";
import { getErrorMessage } from "@/shared/api";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { getPlatform, type PlatformSlug } from "@/shared/config/platforms";

import {
  useConversation,
  useConversations,
  useConversationsById,
  useMarkRead,
  useSetConversationStatus,
} from "../messages/api/conversations";
import { inboxKeys } from "../messages/api/keys";
import { sendSenderAction } from "../messages/api/messages";
import { syncIfDue } from "../messages/api/sync";
import { useDmBot } from "../messages/bot/store";
import { ChatThread } from "../messages/components/chat-thread";
import { ContactPanel } from "../messages/components/contact-panel";
import { ConversationList, type ListFilter } from "../messages/components/conversation-list";
import { getDmCapabilities, isDmPlatform } from "../messages/lib/capabilities";
import {
  ALL_ACCOUNTS,
  CONVERSATION_PARAM,
  contactName,
  customerKey,
} from "../messages/lib/conversation";
import { useInboxSources } from "../messages/lib/sources";
import { setActiveConversation } from "../messages/store/active-conversation";
import { useCustomers } from "../messages/store/customers-store";
import type { Conversation } from "../messages/types";

/** Give the platform a moment to deliver synced data before re-reading the list. */
const AFTER_SYNC_MS = 5000;

function MessagesContent() {
  const qc = useQueryClient();
  const accounts = useAccounts();
  const brands = useBrands();

  /** Filter: ALL_ACCOUNTS, a Facebook Page ("page:…") or another account ("acc:…"). */
  const [sourceKey, setSourceKey] = useState(ALL_ACCOUNTS);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [platform, setPlatform] = useState<PlatformSlug | null>(null);
  const [query, setQuery] = useState("");
  // The open conversation lives in the URL (?c=<id>) so notifications can deep-link to it.
  const [params, setParams] = useSearchParams();
  const selectedId = params.get(CONVERSATION_PARAM) ?? undefined;

  // Lets the notifier skip messages for the thread the user is reading.
  useEffect(() => {
    setActiveConversation(selectedId ?? null);
    return () => setActiveConversation(null);
  }, [selectedId]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const dmAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => isDmPlatform(a.platform)),
    [accounts.data],
  );
  const { sources, sourceOf } = useInboxSources(dmAccounts);
  const source = sources.find((s) => s.key === sourceKey);
  const conversations = useConversations({
    accountId: source?.accountId,
    pageId: source?.pageId,
    status: filter === "archived" ? "archived" : "active",
  });
  const markRead = useMarkRead();
  const setStatus = useSetConversationStatus();

  // Pull fresh data from the platforms when the inbox opens (each target at most every 5 min).
  const dmAccountIds = dmAccounts.map((a) => a.id).join(",");
  useEffect(() => {
    if (!dmAccountIds) return;
    Promise.all(dmAccountIds.split(",").map((id) => syncIfDue(id))).then((started) => {
      if (started.some(Boolean)) {
        setTimeout(
          () => qc.invalidateQueries({ queryKey: inboxKeys.conversationsAll }),
          AFTER_SYNC_MS,
        );
      }
    });
  }, [dmAccountIds, qc]);

  const all = useMemo(
    () => (conversations.data?.pages ?? []).flatMap((p) => p.data ?? []),
    [conversations.data],
  );

  const platforms = useMemo(
    () => [
      ...new Set(
        dmAccounts.map((a) => getPlatform(a.platform)?.slug).filter(Boolean) as PlatformSlug[],
      ),
    ],
    [dmAccounts],
  );

  // Conversations the DM bot handed to a human, newest handoff first. Ones not in the
  // loaded pages (older / other account) are fetched by id.
  const handoffs = useDmBot((s) => s.paused);
  const botEnabled = useDmBot((s) => s.enabled);
  const handoffIds = useMemo(
    () =>
      Object.entries(handoffs)
        .sort((a, b) => b[1].at.localeCompare(a[1].at))
        .map(([id]) => id),
    [handoffs],
  );
  const showHandoff = botEnabled || handoffIds.length > 0;
  const view: ListFilter = filter === "handoff" && !showHandoff ? "all" : filter;
  const missingIds = useMemo(
    () => (view === "handoff" ? handoffIds.filter((id) => !all.some((c) => c.id === id)) : []),
    [view, handoffIds, all],
  );
  const fetched = useConversationsById(missingIds);
  const handoffList = useMemo(() => {
    if (view !== "handoff") return [];
    const byId = new Map([...all, ...fetched.data].map((c) => [c.id, c]));
    return handoffIds.flatMap((id) => {
      const c = byId.get(id);
      // Respect the account / Page filter like the other tabs.
      return c && (!source || sourceOf(c)?.key === source.key) ? [c] : [];
    });
  }, [view, all, fetched.data, handoffIds, source, sourceOf]);

  const customers = useCustomers((s) => s.customers);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Saved customer info is searchable too (phone, email…).
    const matchesCustomer = (c: Conversation) => {
      const info = customers[customerKey(c)];
      return (
        !!info && [info.phone, info.email, info.address].some((v) => v?.toLowerCase().includes(q))
      );
    };
    return (view === "handoff" ? handoffList : all).filter(
      (c) =>
        (view !== "unread" || c.unread_count > 0) &&
        (!platform || getPlatform(c.platform)?.slug === platform) &&
        (!q ||
          contactName(c).toLowerCase().includes(q) ||
          c.last_message.toLowerCase().includes(q) ||
          matchesCustomer(c)),
    );
  }, [all, view, handoffList, platform, query, customers]);

  const unreadTotal = all.reduce((n, c) => n + c.unread_count, 0);

  // From the loaded list when possible; otherwise fetched on its own (later page, archived,
  // or opened from a notification).
  const inList = all.find((c) => c.id === selectedId);
  const single = useConversation(selectedId, !inList && !conversations.isLoading);
  const current = inList ?? single.data;
  const currentAccount = dmAccounts.find((a) => a.id === current?.account_id);
  const brandName = brands.data?.find((b) => b.id === currentAccount?.brand_id)?.name;

  /** POST …/read, plus a visible "seen" for the contact where the platform supports it. */
  const markConversationRead = (c: Conversation) => {
    if (c.unread_count === 0) return Promise.resolve();
    if (getDmCapabilities(c.platform).senderActions) {
      sendSenderAction(c.id, c.account_id, "mark_seen").catch(() => {});
    }
    return markRead.mutateAsync(c.id);
  };

  const select = (c: Conversation) => setParams({ [CONVERSATION_PARAM]: c.id }, { replace: true });

  // Opening a conversation (by click or deep link) marks it read — once per open.
  const markedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!current || markedFor.current === current.id) return;
    markedFor.current = current.id;
    markConversationRead(current).catch(() => {});
    // markConversationRead is recreated each render; keying on the id is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const markAllRead = async () => {
    const unread = all.filter((c) => c.unread_count > 0);
    const results = await Promise.allSettled(unread.map(markConversationRead));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) toast.error(`${failed} hội thoại chưa đánh dấu được`);
    else toast.success(`Đã đánh dấu ${unread.length} hội thoại là đã đọc`);
  };

  const toggleArchive = async (c: Conversation) => {
    const next = c.status === "archived" ? "active" : "archived";
    try {
      await setStatus.mutateAsync({ id: c.id, status: next });
      toast.success(next === "archived" ? "Đã lưu trữ hội thoại" : "Đã bỏ lưu trữ");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const syncNow = async () => {
    const targets = source ? [source.accountId] : dmAccounts.map((a) => a.id);
    setSyncing(true);
    const started = (await Promise.all(targets.map((id) => syncIfDue(id)))).filter(Boolean).length;
    setSyncing(false);
    if (started === 0) {
      toast("Vừa đồng bộ gần đây, mỗi tài khoản chỉ đồng bộ được 5 phút một lần.");
      conversations.refetch();
      return;
    }
    toast.success(`Đang đồng bộ ${started} tài khoản…`);
    setTimeout(() => qc.invalidateQueries({ queryKey: inboxKeys.all }), AFTER_SYNC_MS);
  };

  if (accounts.isLoading) return null;
  if (accounts.error) {
    return (
      <div className="p-4">
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      </div>
    );
  }
  if (dmAccounts.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Plug}
          title="Chưa có tài khoản hỗ trợ tin nhắn"
          description="Kết nối Facebook Page, Instagram, WhatsApp, Telegram, Zalo, X hoặc Bluesky để nhận tin nhắn."
          action={
            <Button asChild size="sm">
              <Link to="/accounts">Kết nối tài khoản</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={visible}
        loading={conversations.isLoading || (view === "handoff" && fetched.isLoading)}
        selectedId={current?.id}
        onSelect={select}
        sources={sources}
        sourceKey={sourceKey}
        onSourceChange={setSourceKey}
        sourceOf={sourceOf}
        query={query}
        onQueryChange={setQuery}
        filter={view}
        onFilterChange={setFilter}
        showHandoff={showHandoff}
        platforms={platforms}
        platform={platform}
        onPlatformChange={setPlatform}
        unreadTotal={unreadTotal}
        hasMore={!!conversations.hasNextPage}
        loadingMore={conversations.isFetchingNextPage}
        onLoadMore={() => conversations.fetchNextPage()}
        syncing={syncing}
        onSync={syncNow}
        onMarkRead={(c) =>
          markConversationRead(c).catch((err) => toast.error(getErrorMessage(err)))
        }
        onMarkAllRead={markAllRead}
        onToggleArchive={toggleArchive}
      />

      {conversations.error ? (
        <div className="flex-1 p-4">
          <ErrorState error={conversations.error} onRetry={() => conversations.refetch()} />
        </div>
      ) : current ? (
        <>
          <ChatThread
            key={current.id}
            conversation={current}
            source={sourceOf(current)}
            panelOpen={panelOpen}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            onToggleArchive={() => toggleArchive(current)}
          />
          {panelOpen && (
            <ContactPanel
              conversation={current}
              source={sourceOf(current)}
              brandName={brandName}
              onClose={() => setPanelOpen(false)}
            />
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 text-center">
          <div className="rounded-2xl bg-primary/10 p-4 text-primary">
            <MessageCircle className="size-8" />
          </div>
          <div>
            <p className="font-medium">Chọn một cuộc trò chuyện</p>
            <p className="text-sm text-muted-foreground">
              Tin nhắn từ mọi kênh được gom về một hộp thư.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Unified DM inbox (SocialAPI /inbox/conversations).
 * No webhooks on desktop: lists are polled and /inbox/sync is triggered on open.
 */
export function MessagesPage() {
  return (
    <RequireApiKey>
      <MessagesContent />
    </RequireApiKey>
  );
}
