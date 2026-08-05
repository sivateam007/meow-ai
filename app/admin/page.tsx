"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AdminUser {
  email: string;
  name: string | null;
  isAdmin: boolean;
  status: string;
  requestedAt: number | null;
  grantedAt: number | null;
  lastSeenAt: number | null;
  createdAt: number;
  conversationCount: number;
  lastActivity: number | null;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface ConversationDetail {
  id: string;
  title: string;
  userEmail: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: string; content: string; timestamp: number }[];
}

type View =
  | { name: "users" }
  | { name: "conversations"; email: string }
  | { name: "messages"; email: string; conversation: ConversationDetail };

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  revoked: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [view, setView] = useState<View>({ name: "users" });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(
    async (path: string, options?: RequestInit) => {
      const res = await fetch(path, {
        ...options,
        headers: {
          ...(options?.headers || {}),
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        throw new Error("Forbidden");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }
      return res.json();
    },
    [router]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/users");
      setUsers(data);
      setError(null);
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openUser = async (email: string) => {
    setLoading(true);
    try {
      const data = await api(`/api/admin/users/${encodeURIComponent(email)}/conversations`);
      setConversations(data);
      setView({ name: "conversations", email });
      setError(null);
    } catch {
      setError("Could not load conversations.");
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (email: string, id: string) => {
    setLoading(true);
    try {
      const data = await api(`/api/admin/conversations/${id}`);
      setView({ name: "messages", email, conversation: data });
      setError(null);
    } catch {
      setError("Could not load conversation.");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (user: AdminUser, patch: { status?: string; isAdmin?: boolean }) => {
    setUpdating(true);
    try {
      await api(`/api/admin/users/${encodeURIComponent(user.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setUsers((prev) =>
        prev.map((u) => (u.email === user.email ? { ...u, ...patch, status: patch.status ?? u.status } : u))
      );
    } catch {
      setError("Could not update user.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#13111c] text-white">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#3b3558] bg-[#13111c]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center text-sm font-bold">M</div>
          <div>
            <h1 className="font-bold">Admin</h1>
            <p className="text-xs text-gray-500">User access &amp; activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view.name !== "users" && (
            <button
              onClick={() => { setView({ name: "users" }); setError(null); }}
              className="px-3 py-1.5 rounded-lg border border-[#3b3558] text-sm text-gray-300 hover:bg-[#3d3760] transition-colors"
            >
              ← Users
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-lg border border-[#3b3558] text-sm text-gray-300 hover:bg-[#3d3760] transition-colors"
          >
            Back to chat
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 rounded-full bg-[#7c3aed] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {!loading && view.name === "users" && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full max-w-sm bg-[#1e1b2e] border border-[#3b3558] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
            <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-[#3b3558]">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Chats</th>
                    <th className="px-4 py-3">Last activity</th>
                    <th className="px-4 py-3">Last sign-in</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-600">
                        No users found
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.email}
                      onClick={() => openUser(u.email)}
                      className="border-b border-[#3b3558] last:border-0 hover:bg-[#2a2640] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name || "—"}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[u.status] || ""}`}>
                          {u.status}
                          {u.isAdmin && <span className="ml-1 text-[#a78bfa]">· admin</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.conversationCount}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.lastActivity)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.lastSeenAt)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateUser(u, { isAdmin: !u.isAdmin })}
                            disabled={updating}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                              u.isAdmin
                                ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#a78bfa] hover:bg-[#7c3aed]/30"
                                : "border-[#3b3558] text-gray-400 hover:bg-[#3d3760]"
                            }`}
                          >
                            {u.isAdmin ? "Admin" : "Make admin"}
                          </button>
                          <button
                            onClick={() => updateUser(u, { status: u.status === "active" ? "revoked" : "active" })}
                            disabled={updating}
                            className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                              u.status === "active"
                                ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                                : "border-green-500/40 text-green-400 hover:bg-green-500/10"
                            }`}
                          >
                            {u.status === "active" ? "Revoke" : u.status === "pending" ? "Grant" : "Regrant"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && view.name === "conversations" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">{view.email}</h2>
            <p className="text-xs text-gray-500 mb-4">Conversations (click to view messages)</p>
            <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl overflow-hidden">
              {conversations.length === 0 && (
                <div className="px-4 py-10 text-center text-gray-600 text-sm">No conversations</div>
              )}
              <div className="divide-y divide-[#3b3558]">
                {conversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    onOpen={(id) => openConversation(view.email, id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && view.name === "messages" && (
          <div>
            <h2 className="text-lg font-semibold mb-1">{view.conversation.title}</h2>
            <p className="text-xs text-gray-500 mb-4">
              {view.conversation.userEmail} · {view.conversation.messages.length} messages
            </p>
            <div className="bg-[#1e1b2e] border border-[#3b3558] rounded-2xl overflow-hidden">
              {view.conversation.messages.map((m, i) => (
                <div key={i} className="border-b border-[#3b3558] last:border-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs border ${
                        m.role === "user"
                          ? "bg-[#7c3aed]/20 border-[#7c3aed]/40 text-[#a78bfa]"
                          : "bg-[#2a2640] border-[#3b3558] text-gray-300"
                      }`}
                    >
                      {m.role}
                    </span>
                    <span className="text-xs text-gray-600">{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ConversationRow({
  conversation,
  onOpen,
}: {
  conversation: { id: string; title: string; messageCount: number; updatedAt: number };
  onOpen: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onOpen(conversation.id)}
      className="flex items-center justify-between px-4 py-3 hover:bg-[#2a2640] cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm text-gray-200 truncate">{conversation.title}</p>
          <p className="text-xs text-gray-600">{conversation.messageCount} messages</p>
        </div>
      </div>
      <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(conversation.updatedAt)}</span>
    </div>
  );
}
