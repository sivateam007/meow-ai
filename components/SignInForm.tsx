"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  completeGoogleRedirect,
  signInWithPassword,
  startGoogleSignIn,
  type SignInOutcome,
} from "@/lib/supabase/browser-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Sign-in form shared by the login and access-denied pages.
 *
 * Handles the whole client-side flow: Supabase Auth (password, or a Google
 * redirect) → access token → POST /api/auth/session → redirect. On success we
 * do a full page load so the server re-reads the freshly set session cookie.
 */

const inputClass =
  "w-full bg-[#15122a] border border-[#3b3558] rounded-xl px-4 py-3 text-white " +
  "placeholder-gray-500 outline-none focus:border-[#7c3aed] transition-colors";

/** Turns an outcome into a navigation, or returns an error to display. */
function applyOutcome(result: SignInOutcome, redirectTo?: string): string | null {
  if (result.ok) {
    window.location.href = redirectTo || "/";
    return null;
  }
  if (result.reason === "pending" || result.reason === "revoked") {
    window.location.href = "/access-denied";
    return null;
  }
  return result.message;
}

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | "google" | "callback" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google sign-in returns to this page with tokens in the URL. Exchange them
  // for our cookie once on mount. The ref guards against React re-running the
  // effect, which would otherwise send the same token twice.
  const handledCallback = useRef(false);

  useEffect(() => {
    if (handledCallback.current) return;
    if (!isSupabaseConfigured()) return;
    handledCallback.current = true;

    // Deliberately not aborting on cleanup: StrictMode mounts, unmounts and
    // remounts in development, and cancelling here would abandon the exchange
    // before it finished. The ref already guarantees a single run.
    void (async () => {
      const result = await completeGoogleRedirect();

      // null means we were not reached via a Google redirect — leave the form
      // untouched and let the user sign in normally.
      if (result === null) return;

      setBusy("callback");
      setError(applyOutcome(result, redirectTo));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Sign-in is not configured yet. Please contact support.");
      return;
    }
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy("password");
    const result = await signInWithPassword(email, password);
    setError(applyOutcome(result, redirectTo));
    setBusy(null);
  };

  const handleGoogle = async () => {
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Sign-in is not configured yet. Please contact support.");
      return;
    }

    setBusy("google");
    const result = await startGoogleSignIn();

    // A successful call navigates away, so this only runs on failure.
    if (!result.ok) {
      setError(result.message);
      setBusy(null);
    }
  };

  return (
    <div>
      <button
        onClick={handleGoogle}
        disabled={busy !== null}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {busy === "callback" ? "Finishing sign-in..." : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-[#3b3558]" />
        <span className="text-xs text-gray-500 uppercase tracking-wide">or</span>
        <div className="h-px flex-1 bg-[#3b3558]" />
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={busy !== null}
          className="w-full bg-[#7c3aed] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "password" ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
    </div>
  );
}
