"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: {
        GoogleAuth?: {
          signIn: () => Promise<{ idToken: string }>;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [isNative, setIsNative] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const native = window.Capacitor?.isNativePlatform() === true;
    setIsNative(native);
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isNative) {
      signIn("google", { callbackUrl: "/" });
      return;
    }

    setLoading(true);
    try {
      const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
      if (!GoogleAuth) {
        console.warn("GoogleAuth plugin not available, falling back to web flow");
        signIn("google", { callbackUrl: "/" });
        return;
      }
      const result = await GoogleAuth.signIn();
      if (result?.idToken) {
        const res = await signIn("google-native", { idToken: result.idToken, redirect: false, callbackUrl: "/" });
        if (res?.ok) {
          window.location.href = "/";
        } else {
          console.error("Native sign-in failed:", res?.error);
          signIn("google", { callbackUrl: "/" });
        }
      } else {
        console.warn("No ID token from native plugin, falling back");
        signIn("google", { callbackUrl: "/" });
      }
    } catch (e) {
      console.error("Native sign-in error:", e);
      signIn("google", { callbackUrl: "/" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#13111c]">
      <div className="chat-bg absolute inset-0" />
      <div className="chat-bg-overlay absolute inset-0" />
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#7c3aed] flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><ellipse cx="7" cy="5.5" rx="2" ry="2.5"/><ellipse cx="12" cy="4" rx="2" ry="2.5"/><ellipse cx="17" cy="5.5" rx="2" ry="2.5"/><path d="M4.5 13c0-3 2-5.5 5-6.5.8-.3 1.6-.3 2.5 0 3 1 5 3.5 5 6.5 0 2.5-1.5 4.5-3.5 5.5l-1.5.8c-.5.3-1 .5-1.5.5s-1-.2-1.5-.5l-1.5-.8c-2-1-3.5-3-3.5-5.5z"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Meow AI</h1>
          <p className="text-gray-400">Sign in to start chatting</p>
        </div>
        <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl p-6">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            {loading ? "Signing in..." : "Continue with Google"}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">
          Meow AI &mdash; Your friendly AI assistant
        </p>
      </div>
    </div>
  );
}
