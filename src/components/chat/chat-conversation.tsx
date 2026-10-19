"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type UIEvent } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Bot, Check, CheckCheck, ChevronUp, LoaderCircle, MessageCircle, Paperclip, RotateCcw, Send, Smile, Trash2, X } from "lucide-react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { toast } from "sonner";
import { Avatar } from "@/components/chat/avatar";
import {
  chatQueryKeys,
  clearConversation,
  getMessages,
  uploadChatMedia,
  type ConversationPage,
  type ConversationRecord,
  type MessageHistoryPage,
  type MessageRecord,
} from "@/lib/chat-api";
import type { AuthUser } from "@/lib/auth";
import { connectSocket } from "@/lib/socket";

interface ChatConversationProps {
  conversation: ConversationRecord;
  currentUser: AuthUser;
  onBack: () => void;
  onOpenProfile: () => void;
  onConversationCleared: (clearedAt: string) => void;
}

interface PendingMessage {
  clientMessageId: string;
  content: string;
  createdAt: string;
  status: "sending" | "failed";
  error?: string;
}

function compareMessages(first: MessageRecord, second: MessageRecord): number {
  const timeDifference = new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
  if (timeDifference !== 0) return timeDifference;
  return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
}

function messageIsAtOrBeforePosition(
  message: MessageRecord,
  positionAt: string | null,
  positionId: string | null,
): boolean {
  if (!positionAt || !positionId) return false;
  const messageTime = new Date(message.createdAt).getTime();
  const positionTime = new Date(positionAt).getTime();
  return messageTime < positionTime || (messageTime === positionTime && message.id <= positionId);
}

function isLaterPosition(
  candidateAt: string | null,
  candidateId: string | null,
  currentAt: string | null,
  currentId: string | null,
): boolean {
  if (!candidateAt || !candidateId) return false;
  if (!currentAt || !currentId) return true;
  const candidateTime = new Date(candidateAt).getTime();
  const currentTime = new Date(currentAt).getTime();
  return candidateTime > currentTime || (candidateTime === currentTime && candidateId > currentId);
}

function requestReadPosition(
  socket: ReturnType<typeof connectSocket>,
  conversationId: string,
  messageId: string,
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  socket.emit("conversation:read", { conversationId, messageId }, (result: { ok: boolean }) => {
    if (!result.ok) return;
    queryClient.setQueryData<InfiniteData<ConversationPage, string | null>>(
      chatQueryKeys.conversations,
      (current) => current ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          conversations: page.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
          ),
        })),
      } : current,
    );
    void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
  });
}

function mergeMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: MessageRecord,
  cutoff: string | null,
): void {
  if (cutoff && new Date(message.createdAt).getTime() <= new Date(cutoff).getTime()) return;
  const queryKey = chatQueryKeys.messages(conversationId);
  queryClient.setQueryData<InfiniteData<MessageHistoryPage, string | null>>(queryKey, (current) => {
    if (!current || current.pages.length === 0) return current;
    if (current.pages.some((page) => page.messages.some((existing) =>
      existing.id === message.id || existing.clientMessageId === message.clientMessageId,
    ))) return current;
    const pages = [...current.pages];
    pages[0] = {
      ...pages[0],
      messages: [...pages[0].messages, message].sort(compareMessages),
    };
    return { ...current, pages };
  });
}

export function ChatConversation({
  conversation,
  currentUser,
  onBack,
  onOpenProfile,
  onConversationCleared,
}: ChatConversationProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const clearDialogRef = useRef<HTMLDialogElement>(null);
  const nearBottomRef = useRef(true);
  const paginationLockedRef = useRef(false);
  const clearedAtRef = useRef(conversation.clearedAt);
  const firstLoadedConversationRef = useRef<string | null>(null);
  const sendingIdsRef = useRef(new Set<string>());
  const deliveredMessageIdsRef = useRef(new Set<string>());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const draftSelectionRef = useRef({ start: 0, end: 0 });
  const [draft, setDraft] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !composerRef.current?.contains(event.target)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEmojiPickerOpen]);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  useEffect(() => () => { if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl); }, [mediaPreviewUrl]);
  const [aiRequests, setAiRequests] = useState<Set<string>>(() => new Set());
  const isAiGenerating = aiRequests.size > 0;
  const [clearCutoff, setClearCutoff] = useState<string | null>(conversation.clearedAt);

  const historyQuery = useInfiniteQuery({
    queryKey: chatQueryKeys.messages(conversation.id),
    queryFn: ({ pageParam, signal }) => getMessages({
      conversationId: conversation.id,
      cursor: pageParam,
      signal,
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  const historyPages = historyQuery.data;
  const historyIsSuccess = historyQuery.isSuccess;
  const refetchMessages = historyQuery.refetch;
  const historyDataUpdatedAt = historyQuery.dataUpdatedAt;

  const serverCutoff = historyQuery.data?.pages[0]?.clearedAt;
  const allMessages = historyQuery.data?.pages.slice().reverse().flatMap((page) => page.messages) ?? [];
  const messages = allMessages.filter((message, index) =>
    allMessages.findIndex((candidate) => candidate.id === message.id) === index,
  );
  const pendingVisible = pendingMessages.filter((pending) =>
    !messages.some((message) => message.clientMessageId === pending.clientMessageId),
  );
  const receiptState = historyQuery.data?.pages[0]?.receiptState ?? null;

  useLayoutEffect(() => {
    if (historyQuery.isSuccess && firstLoadedConversationRef.current !== conversation.id) {
      firstLoadedConversationRef.current = conversation.id;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      nearBottomRef.current = true;
    }
  }, [conversation.id, historyQuery.isSuccess]);

  useEffect(() => {
    clearedAtRef.current = clearCutoff ?? serverCutoff ?? conversation.clearedAt;
  }, [clearCutoff, conversation.clearedAt, conversation.id, serverCutoff]);

  useEffect(() => {
    const socket = connectSocket();
    const onConnect = () => {
      socket.emit("conversation:join", { conversationId: conversation.id });
      paginationLockedRef.current = false;
      sendingIdsRef.current.clear();
      deliveredMessageIdsRef.current.clear();
      void refetchMessages();
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
    };
    const onMessage = (message: MessageRecord) => {
      if (message.conversationId !== conversation.id) return;
      const messageCutoff = clearedAtRef.current;
      if (messageCutoff && new Date(message.createdAt).getTime() <= new Date(messageCutoff).getTime()) return;
      mergeMessage(queryClient, conversation.id, message, messageCutoff);
      if (message.senderType === "assistant" && message.replyToMessageId) {
        setAiRequests((current) => {
          const next = new Set(current);
          next.delete(message.replyToMessageId!);
          return next;
        });
      }
      if (message.senderId !== currentUser.id || message.senderType === "assistant") {
        if (message.senderId !== currentUser.id && !deliveredMessageIdsRef.current.has(message.id)) {
          deliveredMessageIdsRef.current.add(message.id);
          socket.emit("message:delivered", { conversationId: conversation.id, messageId: message.id });
        }
        if (nearBottomRef.current) {
          requestAnimationFrame(() => {
            endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          });
          requestReadPosition(socket, conversation.id, message.id, queryClient);
        } else {
          setNewMessageCount((count) => count + 1);
        }
      }
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
    };
    const onAiStatus = (update: { conversationId: string; requestMessageId: string; active: boolean }) => {
      if (update.conversationId !== conversation.id) return;
      setAiRequests((current) => {
        const next = new Set(current);
        if (update.active) next.add(update.requestMessageId);
        else next.delete(update.requestMessageId);
        return next;
      });
    };
    const onAiError = (update: { conversationId: string; requestMessageId: string; message: string }) => {
      if (update.conversationId !== conversation.id) return;
      const replyAlreadyReceived = queryClient
        .getQueryData<InfiniteData<MessageHistoryPage, string | null>>(chatQueryKeys.messages(conversation.id))
        ?.pages.some((page) => page.messages.some((message) =>
          message.senderType === "assistant" && message.replyToMessageId === update.requestMessageId,
        )) ?? false;
      setAiRequests((current) => {
        const next = new Set(current);
        next.delete(update.requestMessageId);
        return next;
      });
      if (!replyAlreadyReceived) toast.error(update.message);
    };
    const onTyping = (update: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (update.conversationId === conversation.id && update.userId !== currentUser.id) {
        setTypingUserId(update.isTyping ? update.userId : null);
      }
    };
    const onRead = (receipt: { conversationId: string; messageId: string; readAt: string }) => {
      if (receipt.conversationId !== conversation.id) return;
      queryClient.setQueryData<InfiniteData<MessageHistoryPage, string | null>>(
        chatQueryKeys.messages(conversation.id),
        (current) => {
          if (!current?.pages[0]) return current;
          const pages = [...current.pages];
          pages[0] = {
            ...pages[0],
            receiptState: {
              ...(pages[0].receiptState ?? {
                lastDeliveredAt: null,
                lastDeliveredMessageAt: null,
                lastDeliveredMessageId: null,
              }),
              lastReadAt: isLaterPosition(
                receipt.readAt,
                receipt.messageId,
                pages[0].receiptState?.lastReadAt ?? null,
                pages[0].receiptState?.lastReadMessageId ?? null,
              ) ? receipt.readAt : pages[0].receiptState?.lastReadAt ?? null,
              lastReadMessageId: isLaterPosition(
                receipt.readAt,
                receipt.messageId,
                pages[0].receiptState?.lastReadAt ?? null,
                pages[0].receiptState?.lastReadMessageId ?? null,
              ) ? receipt.messageId : pages[0].receiptState?.lastReadMessageId ?? null,
            },
          };
          return { ...current, pages };
        },
      );
    };
    const onDelivered = (receipt: {
      conversationId: string;
      messageId: string;
      messageCreatedAt: string;
      deliveredAt: string;
    }) => {
      if (receipt.conversationId !== conversation.id) return;
      queryClient.setQueryData<InfiniteData<MessageHistoryPage, string | null>>(
        chatQueryKeys.messages(conversation.id),
        (current) => {
          if (!current?.pages[0]) return current;
          const pages = [...current.pages];
          pages[0] = {
            ...pages[0],
            receiptState: {
              ...(pages[0].receiptState ?? {
                lastReadAt: null,
                lastReadMessageId: null,
              }),
              lastDeliveredAt: isLaterPosition(
                receipt.messageCreatedAt,
                receipt.messageId,
                pages[0].receiptState?.lastDeliveredMessageAt ?? null,
                pages[0].receiptState?.lastDeliveredMessageId ?? null,
              ) ? receipt.deliveredAt : pages[0].receiptState?.lastDeliveredAt ?? null,
              lastDeliveredMessageAt: isLaterPosition(
                receipt.messageCreatedAt,
                receipt.messageId,
                pages[0].receiptState?.lastDeliveredMessageAt ?? null,
                pages[0].receiptState?.lastDeliveredMessageId ?? null,
              ) ? receipt.messageCreatedAt : pages[0].receiptState?.lastDeliveredMessageAt ?? null,
              lastDeliveredMessageId: isLaterPosition(
                receipt.messageCreatedAt,
                receipt.messageId,
                pages[0].receiptState?.lastDeliveredMessageAt ?? null,
                pages[0].receiptState?.lastDeliveredMessageId ?? null,
              ) ? receipt.messageId : pages[0].receiptState?.lastDeliveredMessageId ?? null,
            },
          };
          return { ...current, pages };
        },
      );
    };

    socket.on("connect", onConnect);
    socket.on("message:new", onMessage);
    socket.on("typing:update", onTyping);
    socket.on("message:read", onRead);
    socket.on("message:delivered", onDelivered);
    socket.on("ai:status", onAiStatus);
    socket.on("ai:error", onAiError);
    if (socket.connected) queueMicrotask(onConnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("message:new", onMessage);
      socket.off("typing:update", onTyping);
      socket.off("message:read", onRead);
      socket.off("message:delivered", onDelivered);
      socket.off("ai:status", onAiStatus);
      socket.off("ai:error", onAiError);
      if (socket.connected) socket.emit("conversation:leave", { conversationId: conversation.id });
      setTypingUserId(null);
    };
  }, [conversation.id, currentUser.id, queryClient, refetchMessages]);

  useEffect(() => {
    const dialog = clearDialogRef.current;
    if (!dialog) return;
    if (isClearDialogOpen && !dialog.open) dialog.showModal();
    if (!isClearDialogOpen && dialog.open) dialog.close();
  }, [isClearDialogOpen]);

  useEffect(() => {
    if (nearBottomRef.current && !historyQuery.isFetchingNextPage) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      setNewMessageCount(0);
    }
  }, [messages.length, pendingVisible.length, aiRequests.size, historyQuery.isFetchingNextPage]);

  // Auto-resize textarea to fit content (up to ~6 lines)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft]);

  useEffect(() => {
    if (!historyIsSuccess || !historyPages) return;
    const socket = connectSocket();
    if (!socket.connected) return;

    const loadedMessages = historyPages.pages.slice().reverse().flatMap((page) => page.messages);
    for (const message of loadedMessages) {
      const messageCutoff = clearedAtRef.current;
      if (
        message.senderId !== currentUser.id &&
        !deliveredMessageIdsRef.current.has(message.id) &&
        (!messageCutoff || new Date(message.createdAt).getTime() > new Date(messageCutoff).getTime())
      ) {
        deliveredMessageIdsRef.current.add(message.id);
        socket.emit("message:delivered", { conversationId: conversation.id, messageId: message.id });
      }
    }

    const latestMessage = loadedMessages.at(-1);
    if (latestMessage && nearBottomRef.current) {
      requestReadPosition(socket, conversation.id, latestMessage.id, queryClient);
    }
  }, [conversation.id, currentUser.id, historyDataUpdatedAt, historyIsSuccess, historyPages, queryClient]);

  const handleHistoryScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const wasNearBottom = nearBottomRef.current;
    nearBottomRef.current = distanceFromBottom < 120;
    if (nearBottomRef.current) setNewMessageCount(0);
    if (!wasNearBottom && nearBottomRef.current) {
      const latestMessage = messages.at(-1);
      if (latestMessage) requestReadPosition(connectSocket(), conversation.id, latestMessage.id, queryClient);
    }

    if (
      element.scrollTop < 80 &&
      !paginationLockedRef.current &&
      historyQuery.hasNextPage &&
      !historyQuery.isFetchingNextPage
    ) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = () => {
    const container = scrollRef.current;
    if (
      !container ||
      paginationLockedRef.current ||
      !historyQuery.hasNextPage ||
      historyQuery.isFetchingNextPage
    ) return;

    const beforeHeight = container.scrollHeight;
    const beforeTop = container.scrollTop;
    paginationLockedRef.current = true;
    void historyQuery.fetchNextPage().then(() => {
      requestAnimationFrame(() => {
        const currentContainer = scrollRef.current;
        if (currentContainer) {
          currentContainer.scrollTop = beforeTop + currentContainer.scrollHeight - beforeHeight;
        }
        // Unlock even when the fetched page is short or empty.
        paginationLockedRef.current = false;
      });
    }).catch(() => {
      paginationLockedRef.current = false;
    });
  };

  const sendMessage = (content: string, clientMessageId = crypto.randomUUID().replaceAll("-", "_")) => {
    const normalizedContent = content.trim();
    if (isAiGenerating || !normalizedContent || normalizedContent.length > 5_000 || sendingIdsRef.current.has(clientMessageId)) return;
    const socket = connectSocket();
    const createdAt = new Date().toISOString();
    sendingIdsRef.current.add(clientMessageId);
    setPendingMessages((current) => [
      ...current.filter((message) => message.clientMessageId !== clientMessageId),
      { clientMessageId, content: normalizedContent, createdAt, status: "sending" },
    ]);
    if (!socket.connected) {
      sendingIdsRef.current.delete(clientMessageId);
      setPendingMessages((current) => current.map((message) => message.clientMessageId === clientMessageId
        ? { ...message, status: "failed", error: "You’re offline. Retry when reconnected." }
        : message));
      return;
    }

    socket.timeout(150_000).emit("message:send", {
      conversationId: conversation.id,
      content: normalizedContent,
      clientMessageId,
    }, (timeoutError: Error | null, response?: { ok: boolean; message?: MessageRecord; error?: { message: string } }) => {
      sendingIdsRef.current.delete(clientMessageId);
      if (timeoutError || !response?.ok || !response.message) {
        setPendingMessages((current) => current.map((message) => message.clientMessageId === clientMessageId
          ? { ...message, status: "failed", error: response?.error?.message ?? "Message wasn’t sent. Try again." }
          : message));
        return;
      }
      mergeMessage(queryClient, conversation.id, response.message, clearedAtRef.current);
      setPendingMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
    });
  };

  const handleMediaSelect = (file?: File) => {
    if (!file) return;
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const isVideo = file.type === "video/mp4";
    if (!isImage && !isVideo) {
      toast.error("Choose a JPG, PNG, WebP image, or MP4 video.");
      return;
    }
    if (file.size > (isImage ? 10 : 100) * 1024 * 1024) {
      toast.error(isImage ? "Images must be no larger than 10 MB." : "MP4 videos must be no larger than 100 MB.");
      return;
    }
    setSelectedMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const sendSelectedMedia = async () => {
    if (!selectedMedia || isUploadingMedia) return;
    const file = selectedMedia;
    setIsUploadingMedia(true);
    try {
      const attachment = await uploadChatMedia(file);
      const socket = connectSocket();
      if (!socket.connected) throw new Error("You’re offline. Reconnect and try again.");
      socket.timeout(150_000).emit("message:send", {
        conversationId: conversation.id,
        content: draft.trim(),
        attachment,
        clientMessageId: crypto.randomUUID().replaceAll("-", "_"),
      }, (timeoutError: Error | null, response?: { ok: boolean; message?: MessageRecord; error?: { message: string } }) => {
        setIsUploadingMedia(false);
        if (timeoutError || !response?.ok || !response.message) {
          toast.error(response?.error?.message ?? "Media message wasn’t sent.");
          return;
        }
        mergeMessage(queryClient, conversation.id, response.message, clearedAtRef.current);
        void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
        setSelectedMedia(null);
        setMediaPreviewUrl(null);
        setDraft("");
      });
    } catch (error) {
      setIsUploadingMedia(false);
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isAiGenerating) return;
    const content = draft.trim();
    if (selectedMedia) {
      void sendSelectedMedia();
      return;
    }
    if (!content) return;
    sendMessage(content);
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const insertEmoji = (selection: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea || isAiGenerating) return;
    const { start, end } = draftSelectionRef.current;
    const emoji = selection.emoji;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`.slice(0, 5_000);
    const nextCursor = Math.min(start + emoji.length, nextDraft.length);
    setDraft(nextDraft);
    draftSelectionRef.current = { start: nextCursor, end: nextCursor };
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const updateTyping = (value: string) => {
    const socket = connectSocket();
    if (!socket.connected) return;
    if (value.trim()) socket.emit("typing:start", { conversationId: conversation.id });
    else socket.emit("typing:stop", { conversationId: conversation.id });
  };

  const clearHistory = async () => {
    setIsClearing(true);
    try {
      const result = await clearConversation(conversation.id);
      clearedAtRef.current = result.clearedAt;
      setClearCutoff(result.clearedAt);
      setPendingMessages([]);
      setNewMessageCount(0);
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.messages(conversation.id) });
      await queryClient.resetQueries({ queryKey: chatQueryKeys.messages(conversation.id), exact: true });
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
      onConversationCleared(result.clearedAt);
      setIsClearDialogOpen(false);
      toast.success("Your chat history was cleared. The other person’s history is unchanged.");
    } catch {
      toast.error("Couldn’t clear your history. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const renderStatus = (message: MessageRecord) => {
    const receipt = receiptState;
    const isRead = messageIsAtOrBeforePosition(message, receipt?.lastReadAt ?? null, receipt?.lastReadMessageId ?? null);
    const isDelivered = messageIsAtOrBeforePosition(
      message,
      receipt?.lastDeliveredMessageAt ?? null,
      receipt?.lastDeliveredMessageId ?? null,
    );
    const label = isRead ? "Read" : isDelivered ? "Delivered" : "Sent";
    const Icon = isRead || isDelivered ? CheckCheck : Check;
    return (
      <span aria-label={label} title={label} className={isRead ? "text-[#4385ad]" : "text-[#708278]"}>
        <Icon size={13} aria-hidden="true" />
      </span>
    );
  };

  const loadError = historyQuery.error instanceof Error ? "Messages couldn’t be loaded." : "Chat is temporarily unavailable.";
  const aiReplyIndicator = aiRequests.size > 0 ? (
    <article className="message-enter flex justify-start" role="status" aria-live="polite">
      <div className="max-w-[min(82%,620px)] border border-[#e1eae3] bg-white px-3 py-2.5 text-[#718078] shadow-[0_1px_2px_rgba(20,45,32,0.06)] sm:max-w-[72%] sm:px-3.5">
        <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold"><Bot size={12} aria-hidden="true" /> Gemini AI</span>
        <span className="flex items-center gap-2 text-xs">
          <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
          Gemini is replying…
        </span>
      </div>
    </article>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-15 shrink-0 items-center justify-between border-b border-[#dce7df] bg-white/95 px-2.5 sm:h-17 sm:px-5">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="Back to conversations"
            onClick={onBack}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#65766c] transition hover:bg-[#eff4f0] focus-visible:outline-2 focus-visible:outline-[#287254] lg:hidden sm:size-9"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <button type="button" onClick={onOpenProfile} className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
            <Avatar src={conversation.participant.avatarUrl} name={conversation.participant.displayName} online={conversation.participant.isOnline} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#20352b]">{conversation.participant.displayName}</span>
              <span className="mt-0.5 block text-xs text-[#748279]">
                {typingUserId ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span>typing</span>
                    <span className="typing-dot inline-block size-1 rounded-full bg-current" />
                    <span className="typing-dot inline-block size-1 rounded-full bg-current" />
                    <span className="typing-dot inline-block size-1 rounded-full bg-current" />
                  </span>
                ) : conversation.participant.isOnline ? "Online" : "Offline"}
              </span>
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Clear your chat history"
            title="Clear your chat history"
            onClick={() => setIsClearDialogOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-full text-[#6e7d74] transition hover:bg-[#fff2ef] hover:text-[#a44d40] focus-visible:outline-2 focus-visible:outline-[#287254] sm:size-9"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleHistoryScroll}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-6 sm:py-5"
        aria-label={`Messages with ${conversation.participant.displayName}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {historyQuery.hasNextPage ? (
          <button
            type="button"
            disabled={historyQuery.isFetchingNextPage}
            onClick={loadOlderMessages}
            className="mx-auto mb-4 inline-flex min-h-8 items-center gap-1.5 px-3 text-xs font-semibold text-[#51725e] hover:bg-white/70 disabled:opacity-60"
          >
            {historyQuery.isFetchingNextPage ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
            {historyQuery.isFetchingNextPage
              ? "Loading older messages…"
              : historyQuery.isFetchNextPageError
                ? "Couldn’t load older messages · Retry"
                : "Load older messages"}
          </button>
        ) : null}

        {historyQuery.isPending ? (
          <div className="mt-auto mb-auto space-y-3" aria-label="Loading messages">
            {[0, 1, 2].map((item) => <div key={item} className={`h-12 w-3/5 animate-pulse bg-white/80 ${item % 2 ? "ml-auto" : ""}`} />)}
          </div>
        ) : historyQuery.isError ? (
          <div className="m-auto flex max-w-sm flex-col items-center text-center">
            <AlertTriangle size={24} className="text-[#b16b4e]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">{loadError}</p>
            <button type="button" onClick={() => void historyQuery.refetch()} className="mt-3 text-sm font-semibold text-[#287254] underline underline-offset-4">Retry</button>
          </div>
        ) : messages.length === 0 && pendingVisible.length === 0 && aiRequests.size === 0 ? (
          <div className="m-auto flex max-w-sm flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-full bg-white text-[#55836a] shadow-sm">
              <MessageCircle size={23} aria-hidden="true" />
            </span>
            <p className="mt-4 font-heading text-lg font-semibold">A fresh start</p>
            <p className="mt-1 text-sm leading-6 text-[#75847b]">Send a message to start your conversation.</p>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-2 sm:gap-2.5">
            {messages.map((message) => {
              const isAiMessage = message.senderType === "assistant";
              const ownMessage = !isAiMessage && message.senderId === currentUser.id;
              return (
                <article key={message.id} className={`message-enter flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[min(82%,620px)] px-3 py-2 shadow-[0_1px_2px_rgba(20,45,32,0.06)] sm:max-w-[72%] sm:px-3.5 sm:py-2.5 ${ownMessage ? "bg-[#dceee1] text-[#24392d]" : "border border-[#e1eae3] bg-white text-[#283a30]"}`}>
                    {isAiMessage ? <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#718078]"><Bot size={12} aria-hidden="true" /> Gemini AI</p> : null}
                    <p className="whitespace-pre-wrap wrap-break-word text-[14px] leading-[1.55]">{message.content}</p>
                    {message.attachment?.type === "image" ? <img src={message.attachment.url} alt="Shared image" className="mt-2 max-h-80 max-w-full object-contain" /> : null}
                    {message.attachment?.type === "video" ? <video src={message.attachment.url} controls preload="metadata" className="mt-2 max-h-80 max-w-full" /> : null}
                    <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-[#738178]">
                      <time dateTime={message.createdAt}>{format(new Date(message.createdAt), "p")}</time>
                      {ownMessage ? renderStatus(message) : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {pendingVisible.map((pending) => (
              <article key={pending.clientMessageId} className="flex justify-end">
                <div className="max-w-[min(82%,620px)] bg-[#dceee1] px-3 py-2 text-[#24392d] opacity-80 sm:max-w-[72%] sm:px-3.5 sm:py-2.5">
                  <p className="whitespace-pre-wrap wrap-break-word text-[14px] leading-[1.55]">{pending.content}</p>
                  <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] text-[#738178]">
                    <time dateTime={pending.createdAt}>{format(new Date(pending.createdAt), "p")}</time>
                    {pending.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[#a34c3e]">
                        <span>{pending.error ?? "Failed"}</span>
                        <button type="button" aria-label="Retry sending message" disabled={isAiGenerating} onClick={() => sendMessage(pending.content, pending.clientMessageId)} className="inline-flex size-5 items-center justify-center rounded hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50">
                          <RotateCcw size={12} aria-hidden="true" />
                        </button>
                      </span>
                    ) : <span aria-label="Sending"><LoaderCircle size={12} className="animate-spin" aria-hidden="true" /></span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {aiReplyIndicator}
        <div ref={endRef} />
        {newMessageCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              nearBottomRef.current = true;
              setNewMessageCount(0);
            }}
            className="sticky bottom-1 mx-auto inline-flex min-h-9 items-center gap-2 border border-[#cbdccf] bg-white px-3 text-xs font-semibold text-[#315d42] shadow-sm"
          >
            {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"}
            <X size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <form onSubmit={submitMessage} className="shrink-0 border-t border-[#dce7df] bg-white px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {selectedMedia && mediaPreviewUrl ? (
          <div className="mb-2 flex items-center gap-3 border border-[#dce7df] bg-[#f6faf7] p-2.5">
            {selectedMedia.type.startsWith("image/") ? (
              <img src={mediaPreviewUrl} alt="Selected image preview" className="max-h-40 max-w-[min(60%,280px)] object-contain" />
            ) : (
              <video src={mediaPreviewUrl} controls className="max-h-40 max-w-[min(60%,280px)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#40594a]">{selectedMedia.name}</p>
              <p className="mt-1 text-[10px] text-[#829188]">{(selectedMedia.size / (1024 * 1024)).toFixed(1)} MB · Ready to send</p>
            </div>
            <button type="button" aria-label="Remove attachment" disabled={isUploadingMedia} onClick={() => { setSelectedMedia(null); setMediaPreviewUrl(null); }} className="grid size-8 shrink-0 place-items-center text-[#6e7d74] hover:bg-white disabled:opacity-50"><X size={16} /></button>
          </div>
        ) : null}
        <div
          ref={composerRef}
          className="relative flex items-end gap-2 border border-[#dce7df] bg-[#fbfdfb] p-1 focus-within:border-[#75a185] focus-within:ring-2 focus-within:ring-[#4b8a6d]/10 sm:p-1.5"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsEmojiPickerOpen(false);
          }}
        >
          {isEmojiPickerOpen ? (
            <div className="absolute bottom-full left-0 z-30 mb-2 shadow-[0_12px_36px_rgba(20,50,35,0.18)]" onMouseDown={(event) => event.preventDefault()}>
              <EmojiPicker onEmojiClick={insertEmoji} />
            </div>
          ) : null}
          <label className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center text-[#557263] hover:bg-[#edf4ef]" aria-label="Attach image or video">
            <Paperclip size={17} aria-hidden="true" />
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={isAiGenerating || isUploadingMedia} onChange={(event) => { handleMediaSelect(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <label htmlFor="message-composer" className="sr-only">Write a message</label>
          <textarea
            ref={textareaRef}
            id="message-composer"
            value={draft}
            disabled={isAiGenerating}
            onChange={(event) => {
              draftSelectionRef.current = { start: event.target.selectionStart, end: event.target.selectionEnd };
              setDraft(event.target.value.slice(0, 5_000));
              updateTyping(event.target.value);
            }}
            onSelect={(event) => {
              draftSelectionRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
            }}
            onKeyDown={handleComposerKeyDown}
            onBlur={() => updateTyping("")}
            rows={1}
            maxLength={5_000}
            placeholder={isAiGenerating ? "Gemini is replying…" : "Write a message…"}
            style={{ overflow: "hidden" }}
            className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-5 outline-none placeholder:text-[#96a29a] sm:max-h-36"
          />
          <span className="hidden self-center px-1 text-[10px] text-[#8c9991] sm:block">{draft.length}/5000</span>
          <button
            type="button"
            aria-label={isEmojiPickerOpen ? "Close emoji picker" : "Open emoji picker"}
            aria-expanded={isEmojiPickerOpen}
            disabled={isAiGenerating}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setIsEmojiPickerOpen((open) => !open)}
            className="inline-flex size-10 shrink-0 items-center justify-center text-[#557263] transition hover:bg-[#edf4ef] focus-visible:outline-2 focus-visible:outline-[#287254] disabled:opacity-50"
          >
            <Smile size={19} aria-hidden="true" />
          </button>
          <button
            type="submit"
            aria-label="Send message"
            disabled={(!draft.trim() && !selectedMedia) || isAiGenerating || isUploadingMedia}
            className="inline-flex size-10 shrink-0 items-center justify-center bg-[#287254] text-white transition hover:bg-[#205c43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254] disabled:cursor-not-allowed disabled:bg-[#d8e4db] disabled:text-[#87958b]"
          >
            {isUploadingMedia ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] text-[#8a978f] sm:mt-1.5 text-center">{isAiGenerating ? "Sending is paused while Gemini replies…" : "Enter to send · Shift+Enter for a new line · Start with @ai to ask Gemini"}</p>
      </form>

      <dialog
        ref={clearDialogRef}
        aria-labelledby="clear-chat-title"
        className="fixed inset-0 m-auto w-[min(92vw,400px)] border border-[#d7e4da] bg-white p-0 text-[#20352b] shadow-[0_24px_80px_rgba(20,50,35,0.2)] backdrop:bg-[#183c2c]/35"
        onClose={() => setIsClearDialogOpen(false)}
        onCancel={(event) => {
          event.preventDefault();
          setIsClearDialogOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsClearDialogOpen(false);
        }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#fff0eb] text-[#a45140]">
              <Trash2 size={17} aria-hidden="true" />
            </span>
            <button type="button" aria-label="Close confirmation" onClick={() => setIsClearDialogOpen(false)} className="inline-flex size-8 items-center justify-center rounded-full text-[#66766d] hover:bg-[#f0f4f1]">
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <h2 id="clear-chat-title" className="mt-4 font-heading text-xl font-semibold">Clear your chat history?</h2>
          <p className="mt-2 text-sm leading-6 text-[#6e7d74]">This hides the current messages only for you. The other person’s history will remain unchanged.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setIsClearDialogOpen(false)} className="min-h-10 px-4 text-sm font-medium text-[#5e7066] hover:bg-[#eff4f0]">Cancel</button>
            <button type="button" disabled={isClearing} onClick={() => void clearHistory()} className="inline-flex min-h-10 items-center gap-2 bg-[#a45140] px-4 text-sm font-semibold text-white transition hover:bg-[#873d33] disabled:opacity-60">
              {isClearing ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
              {isClearing ? "Clearing…" : "Clear my history"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
