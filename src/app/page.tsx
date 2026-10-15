"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { chatQueryKeys } from "@/lib/chat-api";
import { buildGoogleAuthUrl, getCurrentUser, logoutUser } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";

export default function Home() {
  const queryClient = useQueryClient();
  const currentUserQuery = useQuery({
    queryKey: chatQueryKeys.currentUser,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
  });

  const handleLogin = () => {
    window.location.assign(buildGoogleAuthUrl(window.location.href));
  };

  const handleLogout = async () => {
    await logoutUser();
    disconnectSocket();
    queryClient.setQueryData(chatQueryKeys.currentUser, null);
    await queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  };

  if (currentUserQuery.isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f3f7f3]" aria-label="Restoring session">
        <LoaderCircle className="animate-spin text-[#287254]" size={28} aria-hidden="true" />
      </main>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f3f7f3] px-5">
        <section className="w-full max-w-sm bg-white px-7 py-8 text-center shadow-[0_18px_60px_rgba(22,54,38,0.08)]">
          <MessageCircle className="mx-auto text-[#287254]" size={26} aria-hidden="true" />
          <h1 className="mt-5 font-heading text-xl font-semibold">Chat isn’t reachable</h1>
          <p className="mt-2 text-sm leading-6 text-[#748279]">Check your connection and try restoring your session again.</p>
          <button
            type="button"
            onClick={() => void currentUserQuery.refetch()}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 bg-[#287254] px-5 text-sm font-semibold text-white transition hover:bg-[#205c43]"
          >
            Try again <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </main>
    );
  }

  if (currentUserQuery.data) {
    return <ChatWorkspace currentUser={currentUserQuery.data} onSignOut={handleLogout} />;
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f3f7f3] px-5 py-12 text-[#20352b]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] border-l border-[#e2ebe4] bg-[linear-gradient(145deg,#edf4ee_0%,#f5eee0_56%,#f3f7f3_100%)] lg:block" />
      <section className="chat-arrive relative z-10 grid w-full max-w-245 overflow-hidden border border-[#dce7df] bg-white shadow-[0_24px_80px_rgba(24,60,42,0.09)] md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between px-7 py-8 sm:px-10 sm:py-11">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#287254] text-white">
                <MessageCircle size={19} aria-hidden="true" />
              </span>
              <span className="font-heading text-lg font-semibold">ChatApp</span>
            </div>
            <p className="mt-14 text-[10px] font-bold tracking-[0.18em] text-[#78897f]">A SPACE FOR YOUR PEOPLE</p>
            <h1 className="mt-3 max-w-lg font-heading text-4xl leading-[1.1] font-semibold sm:text-5xl">
              Make room for a good conversation.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#6d7c73]">
              Find the people you know, pick up where you left off, and keep the conversation close.
            </p>
          </div>
          <p className="mt-12 text-xs text-[#849188]">Private by default. Your account stays yours.</p>
        </div>
        <div className="flex flex-col justify-center border-t border-[#e6ede7] bg-[#fbfdfb] px-7 py-9 sm:px-10 md:border-t-0 md:border-l">
          <p className="text-xs font-semibold tracking-[0.12em] text-[#75857b]">WELCOME BACK</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">Sign in to your space</h2>
          <p className="mt-2 text-sm leading-6 text-[#748279]">Use your Google account to continue securely.</p>
          <button
            type="button"
            onClick={handleLogin}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 border border-[#cfdcd2] bg-white px-5 text-sm font-semibold text-[#263d30] transition hover:border-[#8eae98] hover:bg-[#f4f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254]"
          >
            <GoogleMark />
            Continue with Google
            <ArrowRight size={16} className="ml-auto text-[#668071]" aria-hidden="true" />
          </button>
          <p className="mt-5 text-center text-[11px] leading-5 text-[#89968e]">
            Continuing means you agree to use ChatApp respectfully.
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4.5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.65 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.65-5.94c-2.13 1.43-4.86 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
