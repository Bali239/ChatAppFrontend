"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { chatQueryKeys } from "@/lib/chat-api";
import { getCurrentUser, logoutUser, startGoogleLogin } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";

export function ChatRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserQuery = useQuery({
    queryKey: chatQueryKeys.currentUser,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
  });

  useEffect(() => {
    if (currentUserQuery.data === null) router.replace("/signin");
  }, [currentUserQuery.data, router]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      disconnectSocket();
      queryClient.setQueryData(chatQueryKeys.currentUser, null);
      await queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      router.replace("/");
    }
  };

  if (currentUserQuery.data) {
    return <ChatWorkspace currentUser={currentUserQuery.data} onSignOut={handleSignOut} />;
  }

  if (currentUserQuery.isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f3f7f3] px-5">
        <section className="w-full max-w-sm border border-[#dce7df] bg-white px-7 py-8 text-center shadow-[0_18px_60px_rgba(22,54,38,0.08)]">
          <MessageCircle className="mx-auto text-[#287254]" size={26} aria-hidden="true" />
          <h1 className="mt-5 font-heading text-xl font-semibold">We couldn’t restore your session</h1>
          <p className="mt-2 text-sm leading-6 text-[#748279]">Try checking again, or sign in with Google to refresh your session.</p>
          <button
            type="button"
            onClick={() => void currentUserQuery.refetch()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 bg-[#287254] px-5 text-sm font-semibold text-white transition hover:bg-[#205c43]"
          >
            Try again <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => startGoogleLogin(new URL("/chat", window.location.origin).toString())}
            className="mx-auto mt-4 flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-[#287254] hover:text-[#205c43]"
          >
            Sign in again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f3f7f3]" aria-label="Restoring session">
      <LoaderCircle className="animate-spin text-[#287254]" size={28} aria-hidden="true" />
    </main>
  );
}
