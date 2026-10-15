"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, MessageCircle, Settings2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { ProfileDialog } from "@/components/chat/profile-dialog";
import { ProfileSettingsDialog } from "@/components/chat/profile-settings-dialog";
import { Avatar } from "@/components/chat/avatar";
import { createDirectConversation, chatQueryKeys, type ConversationRecord, type PublicUser } from "@/lib/chat-api";
import { selectConversation } from "@/lib/redux/ui-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { AuthUser } from "@/lib/auth";

interface ChatWorkspaceProps {
  currentUser: AuthUser;
  onSignOut: () => Promise<void>;
}

export function ChatWorkspace({ currentUser, onSignOut }: ChatWorkspaceProps) {
  const dispatch = useAppDispatch();
  const selectedConversationId = useAppSelector((state) => state.ui.selectedConversationId);
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null);
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOpeningConversation, setIsOpeningConversation] = useState(false);

  useEffect(() => {
    let socket: ReturnType<typeof connectSocket>;
    try {
      socket = connectSocket();
    } catch {
      return;
    }

    const onConnect = () => {
      setIsConnected(true);
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    };
    const onDisconnect = () => setIsConnected(false);
    const onPresence = () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    };
    const onNewMessage = (message: { conversationId: string }) => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(message.conversationId) });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:update", onPresence);
    socket.on("message:new", onNewMessage);
    if (socket.connected) queueMicrotask(onConnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:update", onPresence);
      socket.off("message:new", onNewMessage);
      disconnectSocket();
    };
  }, [currentUser.id, queryClient]);

  useEffect(() => {
    if (!selectedConversationId) return;
    const socket = connectSocket();
    const joinSelectedConversation = () => {
      socket.emit("conversation:join", { conversationId: selectedConversationId });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(selectedConversationId) });
    };
    socket.on("connect", joinSelectedConversation);
    if (socket.connected) queueMicrotask(joinSelectedConversation);
    return () => {
      socket.off("connect", joinSelectedConversation);
      if (socket.connected) socket.emit("conversation:leave", { conversationId: selectedConversationId });
    };
  }, [queryClient, selectedConversationId]);

  const handleSelectConversation = (conversation: ConversationRecord) => {
    dispatch(selectConversation(conversation.id));
    setSelectedConversation(conversation);
  };

  const handleMessagePerson = async (person: PublicUser) => {
    setIsOpeningConversation(true);
    try {
      const conversationId = await createDirectConversation(person.id);
      const conversation: ConversationRecord = {
        id: conversationId,
        participant: person,
        lastMessage: null,
        lastActivityAt: new Date().toISOString(),
        unreadCount: 0,
        clearedAt: null,
        lastReadAt: null,
        lastReadMessageId: null,
      };
      dispatch(selectConversation(conversationId));
      setSelectedConversation(conversation);
      setProfileUser(null);
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
      toast.success("Conversation opened");
    } catch {
      toast.error("Couldn’t open this conversation. Please try again.");
    } finally {
      setIsOpeningConversation(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
      disconnectSocket();
      dispatch(selectConversation(null));
      setSelectedConversation(null);
    } catch {
      toast.error("Couldn’t sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleBackToPeople = () => {
    dispatch(selectConversation(null));
    setSelectedConversation(null);
  };

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#f3f7f3] text-[#20352b]">
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#dce7df] bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[#287254] text-white">
            <MessageCircle size={16} aria-hidden="true" />
          </span>
          <span className="font-heading text-base font-semibold">ChatApp</span>
          <span className="ml-1 hidden h-5 border-l border-[#dce7df] sm:block" />
          <span className="hidden text-xs text-[#7a8980] sm:block">Private conversations</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden items-center gap-1.5 text-xs sm:inline-flex ${isConnected ? "text-[#547563]" : "text-[#966445]"}`}>
            {isConnected ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
            {isConnected ? "Connected" : "Reconnecting"}
          </span>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-2 outline-none transition hover:bg-[#f2f6f3] focus-visible:ring-2 focus-visible:ring-[#4b8a6d]">
              <Avatar src={currentUser.avatarUrl} name={currentUser.name} size="sm" />
              <span className="hidden max-w-36 truncate text-sm font-medium sm:block">{currentUser.name}</span>
              <ChevronDown size={14} className="text-[#718078]" aria-hidden="true" />
            </summary>
            <div className="absolute top-full right-0 mt-2 w-56 border border-[#dce7df] bg-white p-2 shadow-[0_12px_36px_rgba(22,54,38,0.12)]">
              <div className="border-b border-[#e7eee8] px-3 py-2">
                <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                <p className="truncate text-xs text-[#78877e]">{currentUser.email}</p>
              </div>
              <button type="button" onClick={() => setIsProfileSettingsOpen(true)} className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-[#3f5949] transition hover:bg-[#f2f7f3]">
                <Settings2 size={16} aria-hidden="true" />
                Profile settings
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => void handleSignOut()}
                className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-[#9d4e42] transition hover:bg-[#fff2ef] disabled:opacity-60"
              >
                <LogOut size={16} aria-hidden="true" />
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className={`${selectedConversationId ? "hidden lg:flex" : "flex"} min-h-0 w-full lg:w-auto`}>
          <ChatSidebar
            currentUser={currentUser}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onSelectPerson={setProfileUser}
          />
        </div>

        <section className={`${selectedConversationId ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_top_left,rgba(68,135,96,0.07),transparent_42%)]`}>
          {selectedConversationId && selectedConversation ? (
            <ChatConversation
              key={selectedConversation.id}
              conversation={selectedConversation}
              currentUser={currentUser}
              onBack={handleBackToPeople}
              onOpenProfile={() => setProfileUser(selectedConversation.participant)}
              onConversationCleared={(clearedAt) => {
                setSelectedConversation((current) => current
                  ? { ...current, clearedAt, unreadCount: 0, lastMessage: null }
                  : current);
              }}
            />
          ) : (
            <div className="chat-arrive flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="grid size-19 place-items-center rounded-full border border-[#d6e4da] bg-white text-[#438165] shadow-sm">
                <MessageCircle size={31} strokeWidth={1.4} aria-hidden="true" />
              </span>
              <p className="mt-6 text-[10px] font-bold tracking-[0.18em] text-[#829188]">A QUIETER KIND OF CONNECTION</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold text-[#20352b]">Make room for a good conversation.</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#75847b]">Choose a conversation or find someone new from People.</p>
            </div>
          )}
        </section>
      </div>

      <ProfileDialog
        userId={profileUser?.id ?? null}
        initialUser={profileUser ?? undefined}
        onClose={() => setProfileUser(null)}
        onMessage={handleMessagePerson}
      />
      <ProfileSettingsDialog
        open={isProfileSettingsOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileSettingsOpen(false)}
        onSaved={(updatedUser) => {
          queryClient.setQueryData(chatQueryKeys.currentUser, updatedUser);
          void queryClient.invalidateQueries({ queryKey: ["users"] });
          void queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });
        }}
      />
      {isOpeningConversation ? <span className="sr-only" role="status">Opening conversation</span> : null}
    </main>
  );
}
