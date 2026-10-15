import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Search, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "ChatApp | Make room for a good conversation",
  description: "A quieter space for private conversations with your people.",
};

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f5f8f5] text-[#20352b]">
      <header className="relative z-10 mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ChatApp home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#287254] text-white shadow-sm">
            <MessageCircle size={18} aria-hidden="true" />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">ChatApp</span>
        </Link>
        <Link
          href="/signin"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d5e2d8] bg-white px-4 text-sm font-semibold text-[#315941] shadow-sm transition hover:border-[#9bb9a4] hover:bg-[#f8fbf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254]"
        >
          Sign in <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      <section className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 md:grid-cols-[1.04fr_0.96fr] md:gap-8 md:pb-24 md:pt-16 lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-[-8rem] size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(192,218,199,0.46),rgba(245,248,245,0)_68%)]" />
        <div className="chat-arrive relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#dbe8de] bg-white/75 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-[#557361]">
            <span className="size-1.5 rounded-full bg-[#45a576]" /> A SPACE FOR YOUR PEOPLE
          </p>
          <h1 className="mt-6 font-heading text-[2.8rem] leading-[1.04] font-medium tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
            Good conversations deserve <span className="text-[#397657]">room to grow.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#687a6f] sm:text-lg sm:leading-8">
            A calm, private place to find your people, pick up where you left off, and stay close through the little things.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signin"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#287254] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(40,114,84,0.2)] transition hover:-translate-y-0.5 hover:bg-[#205f45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287254]"
            >
              Start a conversation <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <p className="text-center text-xs text-[#829087] sm:ml-2 sm:text-left">Private by default. Yours to keep.</p>
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs text-[#74847a]">
            <span className="flex -space-x-2" aria-hidden="true">
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#f5f8f5] bg-[#e4ede6] text-[10px] font-semibold text-[#467056]">A</span>
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#f5f8f5] bg-[#efe7d8] text-[10px] font-semibold text-[#8b6a42]">M</span>
              <span className="grid size-8 place-items-center rounded-full border-2 border-[#f5f8f5] bg-[#dcebe6] text-[10px] font-semibold text-[#46786a]">S</span>
            </span>
            <span>Made for the conversations that matter.</span>
          </div>
        </div>

        <div className="chat-arrive relative z-10 mx-auto w-full max-w-[31rem] md:justify-self-end" aria-label="ChatApp conversation preview">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[2rem] bg-[linear-gradient(145deg,rgba(228,239,230,0.75),rgba(246,239,224,0.55))] blur-xl" />
          <div className="relative overflow-hidden rounded-2xl border border-[#dce7df] bg-white shadow-[0_28px_80px_rgba(27,65,44,0.13)]">
            <div className="flex h-[4.25rem] items-center justify-between border-b border-[#e8eee9] px-5">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-full bg-[#e6f0eb] text-sm font-semibold text-[#287254]">J<span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-[#35a77a]" /></span>
                <div><p className="text-sm font-semibold">Jamie Rivera</p><p className="mt-0.5 text-[11px] text-[#7d8b82]">Online now</p></div>
              </div>
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[#9aa69e]">TODAY</span>
            </div>
            <div className="flex min-h-[20rem] flex-col justify-end gap-3 bg-[radial-gradient(ellipse_at_top_left,rgba(68,135,96,0.06),transparent_48%)] px-4 py-5 sm:min-h-[22rem] sm:px-6">
              <p className="mb-1 text-center text-[10px] font-medium text-[#9aa69e]">A little while ago</p>
              <div className="max-w-[82%] self-start rounded-2xl rounded-bl-md border border-[#e4ebe5] bg-white px-4 py-3 shadow-sm">
                <p className="text-[13px] leading-5 text-[#405348]">That walk by the water was exactly what I needed.</p>
                <p className="mt-1.5 text-right text-[10px] text-[#849188]">10:42</p>
              </div>
              <div className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-[#dceee1] px-4 py-3 text-[#304838] shadow-sm">
                <p className="text-[13px] leading-5">Same here. Let’s make it a weekly thing 🌿</p>
                <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[#708278]"><span>10:44</span><Check size={12} aria-hidden="true" /></div>
              </div>
              <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[#e2eae3] bg-white px-3 text-xs text-[#a0aaa3] shadow-sm">
                <span>Write a message…</span><span className="grid size-7 place-items-center rounded-lg bg-[#287254] text-white"><ArrowRight size={14} aria-hidden="true" /></span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-5 border-t border-[#e8eee9] bg-[#fcfdfc] px-4 py-3 text-[10px] font-semibold tracking-[0.04em] text-[#74847a]">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#438165]" aria-hidden="true" /> Private chats</span>
              <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-[#438165]" aria-hidden="true" /> Your people</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2ebe4] bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 md:gap-10 md:py-14 lg:px-12">
          <Feature icon={<Users size={18} aria-hidden="true" />} title="Find your people" description="Search for someone you know and start a one-to-one conversation." />
          <Feature icon={<MessageCircle size={18} aria-hidden="true" />} title="Pick up naturally" description="Your conversations stay organized, with the latest messages close at hand." />
          <Feature icon={<Search size={18} aria-hidden="true" />} title="Keep it personal" description="A focused space for direct chats, without the noise of a crowded feed." />
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[#829087] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} ChatApp</span>
        <span>Private by default. Your account stays yours.</span>
      </footer>
    </main>
  );
}

function Feature({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <article className="flex gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e0eae2] bg-[#f4f8f4] text-[#438165]">{icon}</span>
      <div><h2 className="font-heading text-lg font-semibold">{title}</h2><p className="mt-1.5 text-sm leading-6 text-[#75847b]">{description}</p></div>
    </article>
  );
}
