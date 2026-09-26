"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#13111c]">
      <div className="chat-bg absolute inset-0" />
      <div className="chat-bg-overlay absolute inset-0" />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="7" cy="5.5" rx="2" ry="2.5"/><ellipse cx="12" cy="4" rx="2" ry="2.5"/><ellipse cx="17" cy="5.5" rx="2" ry="2.5"/><path d="M4.5 13c0-3 2-5.5 5-6.5.8-.3 1.6-.3 2.5 0 3 1 5 3.5 5 6.5 0 2.5-1.5 4.5-3.5 5.5l-1.5.8c-.5.3-1 .5-1.5.5s-1-.2-1.5-.5l-1.5-.8c-2-1-3.5-3-3.5-5.5z"/></svg>
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
          <GoogleSignInButton />
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
