"use client";

import { useEffect, useState, type UIEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { MessageCircle, Search, Users } from "lucide-react";
import {
  chatQueryKeys,
  getConversations,
  getUsers,
  searchUsers,
  type ConversationRecord,
  type PublicUser,
} from "@/lib/chat-api";
import { Avatar } from "@/components/chat/avatar";
import { scheduleDebouncedValue } from "@/lib/debounce";
import type { AuthUser } from "@/lib/auth";

interface ChatSidebarProps {
  currentUser: AuthUser;
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onSelectPerson: (user: PublicUser) => void;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function timeLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return formatDistanceToNowStrict(date, { addSuffix: false });
}

function SectionState({
  label,
  onRetry,
}: {
  label: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-4 py-4 text-center text-sm text-[#67776e] sm:py-6">
      <p>{label}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold text-[#287254] underline underline-offset-4">
          Try again
        </button>
      ) : null}
    </div>
  );
}

function PersonRow({ user, onSelect }: { user: PublicUser; onSelect: (user: PublicUser) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#f2f6f3] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#287254] sm:py-3"
    >
      <Avatar src={user.avatarUrl} name={user.displayName} online={user.isOnline} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#20352b]">{user.displayName}</span>
        <span className="block truncate text-xs text-[#728078]">{user.email}</span>
      </span>
      <MessageCircle size={16} className="shrink-0 text-[#718279]" aria-hidden="true" />
    </button>
  );
}

function ConversationRow({
  conversation,
  currentUserId,
  selected,
  onSelect,
}: {
  conversation: ConversationRecord;
  currentUserId: string;
  selected: boolean;
  onSelect: (conversation: ConversationRecord) => void;
}) {
  const latest = conversation.lastMessage;
  const preview = latest
    ? `${latest.senderId === currentUserId ? "You: " : ""}${latest.content}`
    : "Start a conversation";

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      aria-current={selected ? "page" : undefined}
      className={`flex w-full items-center gap-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#287254] sm:py-3 ${selected ? "bg-[#e9f2ec] border-l-3 border-[#287254] pl-3.5 pr-4" : "hover:bg-[#f2f6f3] px-4"}`}
    >
      <Avatar
        src={conversation.participant.avatarUrl}
        name={conversation.participant.displayName}
        online={conversation.participant.isOnline}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[#20352b]">{conversation.participant.displayName}</span>
          {latest ? <time className="shrink-0 text-[11px] text-[#75837b]">{timeLabel(latest.createdAt)}</time> : null}
        </span>
        <span className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-[#718078]">{preview}</span>
          {conversation.unreadCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#287254] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function ChatSidebar({
  currentUser,
  selectedConversationId,
  onSelectConversation,
  onSelectPerson,
}: ChatSidebarProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const normalizedSearch = debouncedSearch.trim().replace(/\s+/g, " ");
  const isSearching = normalizedSearch.length >= 2;
  const showPeople = searchFocused || searchInput.length > 0;

  // Force re-render every 60 seconds to update relative time labels
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return scheduleDebouncedValue(searchInput, setDebouncedSearch);
  }, [searchInput]);

  const conversationsQuery = useInfiniteQuery({
    queryKey: chatQueryKeys.conversations,
    queryFn: ({ pageParam, signal }) => getConversations({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  const peopleQuery = useInfiniteQuery({
    queryKey: ["users", "newest"],
    queryFn: ({ pageParam, signal }) => getUsers({ cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
    enabled: showPeople && !isSearching,
  });
  const searchQuery = useInfiniteQuery({
    queryKey: chatQueryKeys.users(normalizedSearch),
    queryFn: ({ pageParam, signal }) => searchUsers({
      query: normalizedSearch,
      cursor: pageParam,
      signal,
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
    enabled: isSearching,
  });

  const conversations = uniqueById(conversationsQuery.data?.pages.flatMap((page) => page.conversations) ?? []);
  const peoplePages = isSearching ? searchQuery.data?.pages : peopleQuery.data?.pages;
  const people = uniqueById(peoplePages?.flatMap((page) => page.users) ?? []);
  const peopleHasMore = isSearching
    ? searchQuery.hasNextPage
    : peopleQuery.hasNextPage;
  const peopleIsFetchingMore = isSearching
    ? searchQuery.isFetchingNextPage
    : peopleQuery.isFetchingNextPage;

  const loadMorePeople = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 120 && peopleHasMore && !peopleIsFetchingMore) {
      void (isSearching ? searchQuery.fetchNextPage() : peopleQuery.fetchNextPage());
    }
  };

  const loadMoreConversations = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight < 100 &&
      conversationsQuery.hasNextPage &&
      !conversationsQuery.isFetchingNextPage
    ) {
      void conversationsQuery.fetchNextPage();
    }
  };

  return (
    <aside
      onBlurCapture={(event) => {
        // Keep the People list mounted while focus moves from search to a row.
        // Hiding it on the input's blur unmounts the row before its click fires.
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setSearchFocused(false);
        }
      }}
      className="flex h-full min-h-0 w-full flex-col border-r border-[#dce7df] bg-[#fbfdfb] shadow-[8px_0_28px_rgba(22,54,38,0.08)] lg:flex-none lg:w-89 lg:shadow-none xl:w-95"
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e3ebe5] px-4 sm:h-19 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="grid size-8 place-items-center rounded-xl bg-[#287254] text-white sm:size-9">
            <MessageCircle size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-[17px] font-semibold leading-tight text-[#20352b]">ChatApp</p>
            <p className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-[#839188]">YOUR SPACE</p>
          </div>
        </div>
        <span className="rounded-full border border-[#dce7df] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#66766d]">DIRECT</span>
      </header>

      <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
        <label htmlFor="people-search" className="sr-only">Search people by name</label>
        <div className="relative">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#728178]" />
          <input
            id="people-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search people"
            autoComplete="off"
            className="h-10 w-full border border-[#dce7df] bg-white pr-10 pl-10 text-sm text-[#20352b] outline-none transition placeholder:text-[#9aa69f] focus:border-[#4b8a6d] focus:ring-2 focus:ring-[#4b8a6d]/15 sm:h-11"
          />
          {searchInput ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
              className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#748279] hover:bg-[#eff4f0] sm:right-2 sm:size-7"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
        {searchInput.trim().length === 1 ? <p className="mt-2 px-1 text-xs text-[#7b8981]">Enter one more character to search.</p> : null}
      </div>

      {showPeople ? (
        /* ─── People section (shown when search is focused or has text) ─── */
        <section className="flex min-h-0 flex-1 flex-col slide-in-left">
          <div className="flex shrink-0 items-center justify-between px-5 pt-1 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-bold tracking-[0.11em] text-[#76857c]">{isSearching ? "SEARCH RESULTS" : "PEOPLE"}</h2>
              {isSearching ? <span className="max-w-36 truncate text-[11px] text-[#97a29b]">"{normalizedSearch}"</span> : null}
            </div>
            {people.length ? <span className="text-[11px] text-[#87948c]">{people.length}</span> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4" onScroll={loadMorePeople}>
            {isSearching && searchQuery.isPending ? (
              <div className="space-y-2 px-4 py-2" aria-label="Searching people">
                {[0, 1, 2].map((item) => <div key={item} className="h-16.5 animate-pulse bg-[#f0f4f1]" />)}
              </div>
            ) : isSearching && searchQuery.isError ? (
              <SectionState label="Search is unavailable right now." onRetry={() => void searchQuery.refetch()} />
            ) : !isSearching && peopleQuery.isPending ? (
              <div className="space-y-2 px-4 py-2" aria-label="Loading people">
                {[0, 1, 2].map((item) => <div key={item} className="h-16.5 animate-pulse bg-[#f0f4f1]" />)}
              </div>
            ) : !isSearching && peopleQuery.isError ? (
              <SectionState label="Couldn't load people." onRetry={() => void peopleQuery.refetch()} />
            ) : people.length ? (
              people.map((person) => <PersonRow key={person.id} user={person} onSelect={onSelectPerson} />)
            ) : (
              <SectionState label={isSearching ? "No matching people found." : "No other registered people yet."} />
            )}
            {peopleIsFetchingMore ? <p className="px-4 py-2 text-center text-xs text-[#7a8980]">Loading more…</p> : null}
          </div>
        </section>
      ) : (
        /* ─── Conversations section (shown by default) ─── */
        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-1">
            <h2 className="text-[11px] font-bold tracking-[0.11em] text-[#76857c]">CONVERSATIONS</h2>
            {conversations.length ? <span className="text-[11px] text-[#87948c]">{conversations.length}</span> : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2" onScroll={loadMoreConversations}>
            {conversationsQuery.isPending ? (
              <div className="space-y-2 px-4 py-2" aria-label="Loading conversations">
                {[0, 1, 2].map((item) => <div key={item} className="h-16.5 animate-pulse bg-[#f0f4f1]" />)}
              </div>
            ) : conversationsQuery.isError ? (
              <SectionState label="Couldn't load conversations." onRetry={() => void conversationsQuery.refetch()} />
            ) : conversations.length ? (
              conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  currentUserId={currentUser.id}
                  selected={selectedConversationId === conversation.id}
                  onSelect={onSelectConversation}
                />
              ))
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-6 text-center text-sm text-[#738279] sm:py-8">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#edf3ee] text-[#588069]">
                  <Users size={18} aria-hidden="true" />
                </span>
                <span>Click the search bar above to find people and start a conversation.</span>
              </div>
            )}
            {conversationsQuery.isFetchingNextPage ? <p className="px-4 py-2 text-center text-xs text-[#7a8980]">Loading more…</p> : null}
          </div>
        </section>
      )}

      <footer className="flex h-15 shrink-0 items-center gap-2.5 border-t border-[#e3ebe5] px-3 sm:h-16.5 sm:gap-3 sm:px-4">
        <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#20352b]">{currentUser.name}</span>
          <span className="block truncate text-[11px] text-[#7b8981]">{currentUser.email}</span>
        </span>
        <span className="size-2 rounded-full bg-[#35a77a]" aria-label="Connected" />
      </footer>
    </aside>
  );
}
