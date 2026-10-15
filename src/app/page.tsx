"use client";

import { useEffect, useState } from "react";

import { buildGoogleAuthUrl, getCurrentUser, logoutUser, type AuthUser } from "@/lib/auth";

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    void getCurrentUser()
      .then((nextUser) => setUser(nextUser))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = () => {
    window.location.assign(buildGoogleAuthUrl(window.location.href));
  };

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sky-300">ChatApp</p>
            <h1 className="mt-2 text-3xl font-semibold">Secure access</h1>
          </div>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Signing out…" : "Log out"}
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-slate-300">Loading your session…</p>
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-14 w-14 rounded-full border border-white/15 object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/20 text-lg font-semibold text-sky-200">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xl font-semibold">{user.name}</p>
                <p className="text-sm text-slate-300">{user.email}</p>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              You are signed in securely with a server-managed session.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-slate-300">
              Continue with Google to create a secure session and access the chat experience.
            </p>
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
