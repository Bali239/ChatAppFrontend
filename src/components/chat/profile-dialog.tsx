"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, MessageCircle, X } from "lucide-react";
import { getPublicUser, type PublicUser } from "@/lib/chat-api";
import { Avatar } from "@/components/chat/avatar";

interface ProfileDialogProps {
  userId: string | null;
  initialUser?: PublicUser;
  onClose: () => void;
  onMessage: (user: PublicUser) => Promise<void>;
}

export function ProfileDialog({ userId, initialUser, onClose, onMessage }: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const profileQuery = useQuery({
    queryKey: ["users", "profile", userId],
    queryFn: ({ signal }) => getPublicUser(userId!, signal),
    enabled: Boolean(userId),
    initialData: initialUser?.id === userId ? initialUser : undefined,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (userId && !dialog.open) dialog.showModal();
    if (!userId && dialog.open) dialog.close();
  }, [userId]);

  const handleMessage = async () => {
    if (!profileQuery.data) return;
    setIsCreatingConversation(true);
    try {
      await onMessage(profileQuery.data);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-dialog-title"
      className="m-auto w-[min(92vw,420px)] max-w-none border border-[#d9e5de] bg-white p-0 text-[#20352b] shadow-[0_24px_80px_rgba(20,50,35,0.2)] backdrop:bg-[#183c2c]/35"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative px-7 pt-7 pb-8 sm:px-9">
        <button
          type="button"
          aria-label="Close profile"
          onClick={onClose}
          className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full text-[#586a60] transition hover:bg-[#f0f4f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254]"
        >
          <X size={18} aria-hidden="true" />
        </button>
        {profileQuery.isPending ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4" aria-label="Loading profile">
            <span className="size-20 animate-pulse rounded-full bg-[#e8efea]" />
            <span className="h-4 w-36 animate-pulse rounded bg-[#e8efea]" />
            <span className="h-3 w-48 animate-pulse rounded bg-[#f0f4f1]" />
          </div>
        ) : profileQuery.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <p className="font-medium">Profile unavailable</p>
            <p className="mt-1 text-sm text-[#64756c]">We couldn’t load this person right now.</p>
            <button
              type="button"
              onClick={() => void profileQuery.refetch()}
              className="mt-5 text-sm font-semibold text-[#287254] underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : profileQuery.data ? (
          <div className="flex flex-col items-center pt-7 text-center">
            <Avatar src={profileQuery.data.avatarUrl} name={profileQuery.data.displayName} size="lg" online={profileQuery.data.isOnline} />
            <h2 id="profile-dialog-title" className="mt-5 font-heading text-2xl font-semibold">
              {profileQuery.data.displayName}
            </h2>
            <p className="mt-1 break-all text-sm text-[#617168]">{profileQuery.data.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#52665a]">
              <span className={`size-2 rounded-full ${profileQuery.data.isOnline ? "bg-[#35a77a]" : "bg-[#a8b4ac]"}`} />
              {profileQuery.data.isOnline ? "Online" : "Offline"}
            </div>
            <button
              type="button"
              disabled={isCreatingConversation}
              onClick={() => void handleMessage()}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#287254] px-5 text-sm font-semibold text-white transition hover:bg-[#205c43] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254] disabled:cursor-wait disabled:opacity-60"
            >
              <MessageCircle size={17} aria-hidden="true" />
              {isCreatingConversation ? "Opening conversation…" : "Message"}
              {!isCreatingConversation ? <ArrowUpRight size={16} aria-hidden="true" /> : null}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 inline-flex min-h-10 items-center gap-2 px-4 text-sm text-[#5e7066] transition hover:text-[#20352b]"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to people
            </button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
