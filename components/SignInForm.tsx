"use client";

import { useState, type FormEvent } from "react";

/**
 * Sign-in form for the single-user app.
 *
 * There is no email field and no third-party button: the identity is fixed in
 * the environment and sign-in proves knowledge of one shared secret. The POST
 * returns a cookie, so we do a full page load afterwards to make the server
 * re-read it.
 */

const inputClass =
  "w-full bg-[#15122a] border border-[#3b3558] rounded-xl px-4 py-3 text-white " +
  "placeholder-gray-500 outline-none focus:border-[#7c3aed] transition-colors";

type Busy = "password" | null;

export default function SignInForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setBusy("password");

    let response: Response;
    try {
      response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(null);
      return;
    }

    // Distinguish the failure modes so the message is actionable instead of a
    // generic "sign-in failed".
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (response.ok) {
      window.location.href = "/";
      return;
    }

    setError(
      data?.error ||
        (response.status === 401
          ? "Incorrect password."
          : "Sign-in failed. Please try again.")
    );
    setBusy(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
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
        {busy ? "Signing in..." : "Sign in"}
      </button>

      {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
    </form>
  );
}
