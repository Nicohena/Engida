import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { Card } from "../components/ui/Card";
import { api } from "../lib/api";
import type { Conversation, Message } from "../types";

const MOCK_GUEST_ID = 1;

export default function Messages() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getConversations().then((data) => {
      setConversations(data);
      if (!bookingId && data.length) navigate(`/messages/${data[0].bookingId}`, { replace: true });
    });
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    api.getThread(bookingId).then(setMessages);
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConversation = conversations.find((c) => c.bookingId === Number(bookingId));

  async function handleSend() {
    if (!draft.trim() || !bookingId || messages.length === 0) return;
    const receiverId = messages[0].senderId === MOCK_GUEST_ID ? messages[0].receiverId : messages[0].senderId;
    const sent = await api.sendMessage({ bookingId: Number(bookingId), receiverId, message: draft });
    setMessages((prev) => [...prev, sent]);
    setDraft("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Messages</h1>
      <Card className="grid h-[70vh] grid-cols-1 overflow-hidden md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className="overflow-y-auto border-r border-slate-100">
          {conversations.length === 0 && <p className="p-4 text-sm text-slate-400">No conversations yet.</p>}
          {conversations.map((c) => (
            <button
              key={c.bookingId}
              onClick={() => navigate(`/messages/${c.bookingId}`)}
              className={`flex w-full items-center gap-3 border-b border-slate-50 p-3 text-left transition hover:bg-slate-50 ${
                c.bookingId === Number(bookingId) ? "bg-primary/5" : ""
              }`}
            >
              <img
                src={c.hostAvatar || c.propertyImage || "https://i.pravatar.cc/100"}
                className="h-11 w-11 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{c.hostName}</p>
                <p className="truncate text-xs text-slate-500">{c.propertyName}</p>
                <p className="truncate text-xs text-slate-400">{c.lastMessage}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-400">
                {new Date(c.lastMessageTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </button>
          ))}
        </div>

        {/* Chat window */}
        <div className="flex flex-col">
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <img src={activeConversation.hostAvatar || "https://i.pravatar.cc/100"} className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{activeConversation.hostName}</p>
                  <p className="text-xs text-slate-400">{activeConversation.propertyName}</p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const isGuest = m.senderId === MOCK_GUEST_ID;
                  return (
                    <div key={m.id} className={`flex ${isGuest ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          isGuest ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {m.message}
                        <div className={`mt-1 text-[10px] ${isGuest ? "text-white/70" : "text-slate-400"}`}>
                          {new Date(m.sentAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleSend}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a conversation</div>
          )}
        </div>
      </Card>
    </div>
  );
}
