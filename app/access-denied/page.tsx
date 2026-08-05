"use client";

import { useState } from "react";

export default function AccessDeniedPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const requestAccess = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setStatus("sent");
        } else {
          setStatus("error");
          alert(data.error || "Could not send request.");
        }
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#13111c]">
      <div className="chat-bg absolute inset-0" />
      <div className="chat-bg-overlay absolute inset-0" />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center text-3xl font-bold mx-auto mb-4">
            M
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Access Required</h1>
          <p className="text-gray-400">This app is invite-only.</p>
        </div>
        <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl p-6">
          {status === "sent" ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white font-semibold mb-1">Request sent!</h2>
              <p className="text-gray-400 text-sm mb-4">
                An admin will review your request. Check back later and sign in once approved.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl border border-[#3b3558] text-gray-300 text-sm hover:bg-[#3d3760] transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">
                You don&apos;t have access yet. Enter your email to request access from the admin.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#13111c] border border-[#3b3558] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#7c3aed] transition-colors mb-3"
              />
              <button
                onClick={requestAccess}
                disabled={status === "sending" || !email.trim()}
                className="w-full py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#a78bfa] transition-colors disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Request access"}
              </button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">
          Meow AI &mdash; Your friendly AI assistant
        </p>
      </div>
    </div>
  );
}
