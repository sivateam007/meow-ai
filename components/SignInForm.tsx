"use client";

import { useState, type FormEvent } from "react";
import { signInWithPassword } from "@/lib/supabase/browser-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Email + password sign-in form shared by the login and access-denied pages.
 *
 * Handles the whole client-side flow: Supabase Auth → access token →
 * POST /api/auth/session → redirect. On success we do a full page load so the
 * server re-reads the freshly set session cookie.
 */

const inputClass =
  "w-full bg-[#15122a] border border-[#3b3558] rounded-xl px-4 py-3 text-white " +
  "placeholder-gray-500 outline-none focus:border-[#7c3aed] transition-colors";

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
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

    setLoading(true);

    const result = await signInWithPassword(email, password);

    if (result.ok) {
      window.location.href = redirectTo || "/";
      return;
    }

    setLoading(false);

    if (result.reason === "pending" || result.reason === "revoked") {
      window.location.href = "/access-denied";
      return;
    }

    setError(result.message);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
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
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#7c3aed] text-white font-medium py-3 px-4 rounded-xl hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      {error && <p className="text-red-400 text-sm text-center pt-1">{error}</p>}
    </form>
  );
}
