"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { chatQueryKeys } from "@/lib/chat-api";
import { getCurrentUser, startGoogleLogin } from "@/lib/auth";

export function SignInScreen() {
  const router = useRouter();
  const alreadySignedInNoticeShown = useRef(false);
  const currentUserQuery = useQuery({
    queryKey: chatQueryKeys.currentUser,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
  });

  useEffect(() => {
    if (currentUserQuery.isSuccess && currentUserQuery.data) {
      if (!alreadySignedInNoticeShown.current) {
        alreadySignedInNoticeShown.current = true;
        toast.info("You’re already signed in.");
      }
      router.replace("/chat");
    }
  }, [currentUserQuery.data, currentUserQuery.isSuccess, router]);

  if (currentUserQuery.isPending || currentUserQuery.data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f3f7f3]" aria-label="Checking your session">
        <LoaderCircle className="animate-spin text-[#287254]" size={28} aria-hidden="true" />
      </main>
    );
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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f3f7f3] px-5 py-10 text-[#20352b]">
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 right-[-7rem] size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(192,218,199,0.48),rgba(243,247,243,0)_68%)]" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mx-auto mb-7 flex w-fit items-center gap-2.5" aria-label="Back to ChatApp home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#287254] text-white shadow-sm"><MessageCircle size={18} aria-hidden="true" /></span>
          <span className="font-heading text-lg font-semibold tracking-tight">ChatApp</span>
        </Link>
        <section className="chat-arrive border border-[#dce7df] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(24,60,42,0.1)] sm:px-9 sm:py-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#718078] transition hover:text-[#287254]">
            <ArrowLeft size={14} aria-hidden="true" /> Back to home
          </Link>
          <div className="mt-8">
            <p className="text-[10px] font-bold tracking-[0.17em] text-[#75857b]">WELCOME TO YOUR SPACE</p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Sign in to continue</h1>
            <p className="mt-3 text-sm leading-6 text-[#748279]">Connect with your people in a quieter, more personal space.</p>
          </div>
          <button
            type="button"
            onClick={() => startGoogleLogin(new URL("/chat", window.location.origin).toString())}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#cfdcd2] bg-white px-5 text-sm font-semibold text-[#263d30] transition hover:border-[#8eae98] hover:bg-[#f4f8f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254]"
          >
            <GoogleMark />
            Continue with Google
            <ArrowRight size={16} className="ml-auto text-[#668071]" aria-hidden="true" />
          </button>
          <div className="mt-6 flex items-start gap-2.5 border-t border-[#e8eee9] pt-5 text-xs leading-5 text-[#849188]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#438165]" aria-hidden="true" />
            <p>Sign in securely with Google. Your conversations stay private to your account.</p>
          </div>
        </section>
        <p className="mt-5 text-center text-[11px] text-[#89968e]">Private by default. Your account stays yours.</p>
      </div>
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
