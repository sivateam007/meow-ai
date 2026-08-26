"use client";

import { signIn } from "next-auth/react";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#13111c]">
      <div className="chat-bg absolute inset-0" />
      <div className="chat-bg-overlay absolute inset-0" />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Access Required</h1>
          <p className="text-gray-400">This app is invite-only.</p>
        </div>
        <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl p-6">
          <p className="text-gray-400 text-sm mb-4">
            You don&apos;t have access yet. Sign in with your Google account and we&apos;ll
            automatically send an access request to the admin &mdash; no need to type your
            email. Once approved, sign in again to start chatting.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            Continue with Google
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-xl border border-[#3b3558] text-gray-300 text-sm hover:bg-[#3d3760] transition-colors mt-3"
          >
            Back to sign in
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">
          Meow AI &mdash; Your friendly AI assistant
        </p>
      </div>
    </div>
  );
}
