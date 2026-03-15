import { Sparkle, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "../supabase";
import { ToggleTheme } from "./ToggleTheme";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <section className="min-h-svh bg-[#f3f0ff] dark:bg-[#0f0f13] flex flex-col">
      <header className="w-full bg-white/80 dark:bg-[#1a1a24]/80 backdrop-blur-md border-b border-purple-100 dark:border-purple-900/40 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="size-10 bg-purple-600 flex items-center justify-center text-white rounded-2xl shadow-md shadow-purple-300 dark:shadow-purple-900 shrink-0">
              <Sparkle size={20} />
            </span>
            <h1 className="text-xl font-bold text-purple-700 dark:text-purple-400">My Tasks</h1>
          </div>
          <ToggleTheme />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white dark:bg-[#1e1e2a] rounded-2xl shadow-md shadow-purple-100 dark:shadow-purple-950/50 border border-purple-100 dark:border-purple-900/30 p-6 flex flex-col gap-5">

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="size-16 bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center rounded-full text-purple-500">
                <CheckCircle2 size={36} />
              </span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">Check your email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  We sent a magic link to <span className="font-medium text-purple-600 dark:text-purple-400">{email}</span>
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-100">Sign in to My Tasks</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Sync your tasks across all devices
                </p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-[#f3f0ff] dark:bg-[#0f0f13] border border-purple-100 dark:border-purple-900/40 rounded-xl px-3 focus-within:border-purple-400 dark:focus-within:border-purple-500 transition-colors">
                  <Mail size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 py-3 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm shadow-purple-300 dark:shadow-purple-900"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? "Sending…" : "Send Magic Link"}
                </button>
              </form>

              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                No password needed. We'll email you a sign-in link.
              </p>
            </>
          )}
        </div>
      </main>
    </section>
  );
};
