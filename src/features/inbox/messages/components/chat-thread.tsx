import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Clock,
  Hand,
  Loader2,
  PanelRight,
  RefreshCw,
} from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage, useUsage } from "@/shared/api";
import { ErrorState } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { buildConversationContext } from "../ai/reply-assistant";
import { inboxKeys } from "../api/keys";
import { uploadMedia } from "../api/media";
import { sendSenderAction, setReaction, useMessages, useSendMessage } from "../api/messages";
import { startSync } from "../api/sync";
import { useDmBot } from "../bot/store";
import { getDmCapabilities, isWindowOpen } from "../lib/capabilities";
import { contactName } from "../lib/conversation";
import type { InboxSource } from "../lib/sources";
import {
  formatDayLabel,
  formatListTime,
  formatTime,
  isSameDay,
  minutesBetween,
} from "../lib/format";
import { useCustomers } from "../store/customers-store";
import { useResponders } from "../store/responders-store";
import type { Conversation, DmAttachmentInput, Message } from "../types";
import { Composer } from "./composer";
import { ContactAvatar } from "./contact-avatar";
import { MessageBubble, type BubbleData } from "./message-bubble";

/** Same-side messages closer than this are grouped. */
const GROUP_MINUTES = 5;
/** Gaps at least this long (same day) get a time marker. */
const TIME_BREAK_MINUTES = 30;
const TYPING_EVERY_MS = 15_000;

/** A send that hasn't shown up in the message list yet (or failed). */
interface PendingSend {
  key: string;
  text: string;
  files: File[];
  previews: string[];
  replyTo?: Message;
  createdAt: string;
  status: "sending" | "failed";
  error?: string;
}

interface ChatThreadProps {
  conversation: Conversation;
  /** Page / account the conversation came in on. */
  source?: InboxSource;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onToggleArchive: () => void;
}

export function ChatThread({
  conversation: c,
  source,
  panelOpen,
  onTogglePanel,
  onToggleArchive,
}: ChatThreadProps) {
  const qc = useQueryClient();
  // Re-render when the saved customer name changes (read by contactName).
  useCustomers((s) => s.customers);
  const caps = getDmCapabilities(c.platform);
  const platform = getPlatform(c.platform);
  const thread = useMessages(c.id);
  const sendMessage = useSendMessage();
  const usage = useUsage();
  const handoff = useDmBot((s) => s.paused[c.id]);
  const resumeBot = useDmBot((s) => s.resume);

  const [pending, setPending] = useState<PendingSend[]>([]);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Message>();
  const [syncing, setSyncing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const lastTyping = useRef(0);

  const messages = thread.messages;
  const byPlatformId = new Map(messages.map((m) => [m.platform_id, m]));
  const windowOpen = thread.isLoading || isWindowOpen(caps, messages);
  // Facebook / WhatsApp / Zalo refuse (and still charge) outside the window; Instagram
  // may allow it with HUMAN_AGENT and refunds when blocked, so it only gets a warning.
  const locked = !windowOpen && c.platform !== "instagram";
  const creditsLeft =
    usage.data && usage.data.interactions_limit !== -1
      ? Math.max(0, usage.data.interactions_limit - usage.data.interactions_used)
      : null;

  // Refresh this thread from the platform when it's opened (rate-limited server-side).
  useEffect(() => {
    startSync(c.account_id, c.id)
      .then(() =>
        setTimeout(() => qc.invalidateQueries({ queryKey: inboxKeys.messages(c.id) }), 4000),
      )
      .catch(() => {
        // Recently synced or not supported — the polled list is enough.
      });
  }, [c.id, c.account_id, qc]);

  // Keep the view pinned to the newest message, or keep position when older ones load.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (heightBeforeOlder.current !== null) {
      el.scrollTop = el.scrollHeight - heightBeforeOlder.current;
      heightBeforeOlder.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, pending.length]);

  // Who answered: outgoing texts the bot recorded are its own; any other outgoing message
  // was a person (from this app, or the platform's own app).
  useEffect(() => {
    const botSent = new Set(useDmBot.getState().conversations[c.id]?.sent ?? []);
    const { mark } = useResponders.getState();
    let bot: string | undefined;
    let human: string | undefined;
    for (const m of messages) {
      if (m.direction !== "outgoing") continue;
      if (botSent.has(m.text ?? "")) bot = m.created_at;
      else human = m.created_at;
    }
    if (bot) mark(c.id, "bot", bot);
    if (human) mark(c.id, "human", human);
  }, [c.id, messages]);

  const loadOlder = () => {
    if (scrollRef.current) heightBeforeOlder.current = scrollRef.current.scrollHeight;
    thread.fetchNextPage();
  };

  const patchPending = (key: string, patch: Partial<PendingSend>) =>
    setPending((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const dropPending = (key: string) =>
    setPending((list) => {
      for (const url of list.find((p) => p.key === key)?.previews ?? []) URL.revokeObjectURL(url);
      return list.filter((p) => p.key !== key);
    });

  const deliver = async (p: PendingSend) => {
    patchPending(p.key, { status: "sending", error: undefined });
    try {
      const attachments: DmAttachmentInput[] = [];
      for (const file of p.files) {
        attachments.push({ source_type: "media_id", source: await uploadMedia(file) });
      }
      await sendMessage.mutateAsync({
        conversationId: c.id,
        body: {
          account_id: c.account_id,
          ...(p.text && { text: p.text }),
          ...(attachments.length > 0 && { attachments }),
          ...(p.replyTo && caps.replyTo && { reply_to_message_id: p.replyTo.platform_id }),
        },
      });
      dropPending(p.key);
    } catch (err) {
      patchPending(p.key, { status: "failed", error: getErrorMessage(err) });
    }
  };

  const onSend = (text: string, files: File[]) => {
    const p: PendingSend = {
      key: crypto.randomUUID(),
      text,
      files,
      previews: files.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
      replyTo,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    stickToBottom.current = true;
    setPending((list) => [...list, p]);
    setReplyTo(undefined);
    deliver(p);
  };

  const onTyping = () => {
    if (!caps.senderActions || Date.now() - lastTyping.current < TYPING_EVERY_MS) return;
    lastTyping.current = Date.now();
    sendSenderAction(c.id, c.account_id, "typing_on").catch(() => {});
  };

  const react = async (m: Message, emoji: string | null) => {
    const previous = reactions[m.platform_id];
    const apply = (value?: string) =>
      setReactions((r) => {
        const next = { ...r };
        if (value) next[m.platform_id] = value;
        else delete next[m.platform_id];
        return next;
      });
    apply(emoji ?? undefined);
    try {
      await setReaction(c.id, m.platform_id, c.account_id, emoji);
    } catch (err) {
      apply(previous);
      toast.error(getErrorMessage(err));
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await startSync(c.account_id, c.id);
      toast.success("Đang đồng bộ hội thoại…");
      setTimeout(() => qc.invalidateQueries({ queryKey: inboxKeys.messages(c.id) }), 4000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const bubbles: { data: BubbleData; message?: Message; pending?: PendingSend }[] = [
    ...messages.map((m) => ({
      message: m,
      data: {
        key: m.id,
        outgoing: m.direction === "outgoing",
        text: m.text,
        attachment: m.attachment_type
          ? { type: m.attachment_type, url: m.attachment_url }
          : undefined,
        createdAt: m.created_at,
        status: m.status,
        quoted: m.reply_to
          ? (byPlatformId.get(m.reply_to.platform_id)?.text ?? "Tin nhắn trước đó")
          : undefined,
      },
    })),
    ...pending.map((p) => ({
      pending: p,
      data: {
        key: p.key,
        outgoing: true,
        text:
          p.text ||
          (p.files.length > 0 && p.previews.length === 0
            ? `📎 ${p.files.map((f) => f.name).join(", ")}`
            : null),
        localImages: p.previews,
        createdAt: p.createdAt,
        status: p.status,
        error: p.error,
        quoted: p.replyTo?.text ?? undefined,
      },
    })),
  ];

  const name = contactName(c);
  const serverSyncing = thread.data?.pages[0]?.sync_state === "syncing";

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <ContactAvatar
          name={name}
          picture={c.participant_picture || undefined}
          seed={c.participant_id || c.id}
          platform={c.platform}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {platform?.label}
            {source && <> · {source.name}</>}
          </p>
        </div>

        {serverSyncing && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Button
          variant="ghost"
          size="icon-sm"
          title="Đồng bộ hội thoại"
          disabled={syncing}
          onClick={syncNow}
        >
          <RefreshCw className={syncing ? "animate-spin" : undefined} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={c.status === "archived" ? "Bỏ lưu trữ" : "Lưu trữ"}
          onClick={onToggleArchive}
        >
          {c.status === "archived" ? <ArchiveRestore /> : <Archive />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Thông tin liên hệ"
          onClick={onTogglePanel}
          className={panelOpen ? "bg-muted" : undefined}
        >
          <PanelRight />
        </Button>
      </header>

      {handoff && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          <Hand className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 truncate">
            <span className="font-medium">AI đã chuyển cho bạn</span>
            <span className="text-muted-foreground">
              {" "}
              · {handoff.reason} · {formatListTime(handoff.at)}
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs"
            title="Đánh dấu đã xử lý và cho AI tiếp tục trả lời hội thoại này"
            onClick={() => {
              resumeBot(c.id);
              toast.success("Đã trả hội thoại lại cho bot");
            }}
          >
            <Bot /> Đã xử lý — trả lại cho bot
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-4"
      >
        <div className="flex flex-col">
          {thread.hasNextPage && (
            <div className="mb-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadOlder}
                disabled={thread.isFetchingNextPage}
              >
                {thread.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Tải tin nhắn cũ hơn
              </Button>
            </div>
          )}

          {thread.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : thread.error ? (
            <ErrorState error={thread.error} onRetry={() => thread.refetch()} />
          ) : bubbles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Chưa có tin nhắn. Bấm đồng bộ để tải lịch sử từ {platform?.label}.
            </p>
          ) : (
            bubbles.map(({ data, message, pending: p }, i) => {
              const prev = bubbles[i - 1]?.data;
              const next = bubbles[i + 1]?.data;
              const newDay = !prev || !isSameDay(prev.createdAt, data.createdAt);
              // A long pause within the same day gets a centred time marker.
              const timeBreak =
                !!prev &&
                !newDay &&
                minutesBetween(prev.createdAt, data.createdAt) >= TIME_BREAK_MINUTES;
              // Consecutive messages from the same side, close in time, form one visual group.
              const withPrev =
                !!prev &&
                !newDay &&
                prev.outgoing === data.outgoing &&
                minutesBetween(prev.createdAt, data.createdAt) < GROUP_MINUTES;
              const withNext =
                !!next &&
                isSameDay(next.createdAt, data.createdAt) &&
                next.outgoing === data.outgoing &&
                minutesBetween(next.createdAt, data.createdAt) < GROUP_MINUTES;
              const lastOfGroup = !withNext || !!p;
              // One avatar per uninterrupted run of the contact's messages (any time gap),
              // until we reply or the day changes.
              const endOfRun =
                !next ||
                next.outgoing !== data.outgoing ||
                !isSameDay(next.createdAt, data.createdAt);

              return (
                <Fragment key={data.key}>
                  {newDay && (
                    <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      {formatDayLabel(data.createdAt)}
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  {timeBreak && (
                    <p className="my-3 text-center text-[11px] text-muted-foreground">
                      {formatTime(data.createdAt)}
                    </p>
                  )}
                  <div className={cn("flex items-end gap-2", withPrev ? "mt-0.5" : "mt-3")}>
                    {/* Contact avatar beside the last bubble of each incoming group. */}
                    {!data.outgoing && (
                      <div className={cn("w-7 shrink-0", endOfRun && lastOfGroup && "mb-5")}>
                        {endOfRun && (
                          <ContactAvatar
                            name={name}
                            picture={c.participant_picture || undefined}
                            seed={c.participant_id || c.id}
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <MessageBubble
                        data={data}
                        first={!withPrev}
                        last={lastOfGroup}
                        myReaction={message ? reactions[message.platform_id] : undefined}
                        onReact={
                          message && caps.reactions && message.platform_id
                            ? (emoji) => react(message, emoji)
                            : undefined
                        }
                        onReply={
                          message && caps.replyTo && message.platform_id
                            ? () => setReplyTo(message)
                            : undefined
                        }
                        onRetry={p?.status === "failed" ? () => deliver(p) : undefined}
                        onDiscard={p?.status === "failed" ? () => dropPending(p.key) : undefined}
                      />
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      {!windowOpen && !locked && (
        <div className="flex items-center gap-2 border-t bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="size-3.5 shrink-0" />
          Đã quá {caps.windowHours} giờ kể từ tin nhắn cuối của khách — {platform?.label} có thể từ
          chối tin trả lời.
        </div>
      )}

      <Composer
        caps={caps}
        lockedReason={
          locked
            ? `Đã quá ${caps.windowHours! >= 48 ? `${caps.windowHours! / 24} ngày` : `${caps.windowHours} giờ`} kể từ tin nhắn cuối của khách — ${platform?.label} chỉ cho trả lời trong khung thời gian này.`
            : undefined
        }
        onSend={onSend}
        onTyping={onTyping}
        replyTo={replyTo ? (replyTo.text ?? "") : undefined}
        onCancelReply={() => setReplyTo(undefined)}
        getAiContext={() => buildConversationContext(c, messages)}
        creditsLeft={creditsLeft}
        placeholder={`Trả lời ${name}…`}
      />
    </section>
  );
}
