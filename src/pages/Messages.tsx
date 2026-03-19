import { useState, useRef, useEffect } from "react";
import { useConversations, useMessages, createConversation, type ConversationSummary } from "@/hooks/useConversations";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Send, ArrowLeft, Plus, Search,
  User, Building2, Shield, Compass, X,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const USER_TYPE_ICON: Record<string, any> = {
  client: User,
  partner: Building2,
  architect: Compass,
  admin: Shield,
};

const USER_TYPE_LABEL: Record<string, string> = {
  client: "Client",
  partner: "Partenaire",
  architect: "Architecte",
  admin: "Admin",
};

const USER_TYPE_COLOR: Record<string, string> = {
  client: "text-blue-600 bg-blue-50",
  partner: "text-emerald-600 bg-emerald-50",
  architect: "text-purple-600 bg-purple-50",
  admin: "text-red-600 bg-red-50",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

function getOtherParticipants(conv: ConversationSummary, myId: string) {
  return conv.participants.filter(p => p.user_id !== myId);
}

function participantName(p: { profile: { first_name: string | null; last_name: string | null; email: string; company: string | null } }) {
  const name = [p.profile.first_name, p.profile.last_name].filter(Boolean).join(" ");
  return name || p.profile.email;
}

// ── New Conversation Modal ──
function NewConversationModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (convId: string) => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["all_users_for_messaging", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type, company")
        .neq("id", user!.id)
        .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`)
        .limit(10);
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!selectedUser || !message.trim()) return;
    setCreating(true);
    try {
      const convId = await createConversation(
        user!.id,
        [selectedUser.id],
        subject || `Conversation avec ${selectedUser.first_name || selectedUser.email}`,
        message,
      );
      onCreate(convId);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-sm shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-sm">Nouvelle conversation</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Recipient search */}
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Destinataire</label>
            {selectedUser ? (
              <div className="flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2">
                <span className="text-sm font-body text-foreground flex-1">
                  {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(" ") || selectedUser.email}
                </span>
                <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[selectedUser.user_type] || ""}`}>
                  {USER_TYPE_LABEL[selectedUser.user_type] || selectedUser.user_type}
                </span>
                <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, entreprise..."
                  className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                />
                {users.length > 0 && search.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-sm shadow-md mt-1 max-h-48 overflow-y-auto">
                    {users.map(u => {
                      const Icon = USER_TYPE_ICON[u.user_type] || User;
                      return (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setSearch(""); }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-card transition-colors"
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-body text-foreground truncate">
                              {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                            </p>
                            {u.company && <p className="text-[10px] text-muted-foreground truncate">{u.company}</p>}
                          </div>
                          <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[u.user_type] || ""}`}>
                            {USER_TYPE_LABEL[u.user_type] || u.user_type}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Sujet (optionnel)</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Sujet de la conversation..."
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Votre message..."
              rows={4}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose}
            className="px-4 py-2 font-display font-semibold text-xs border border-border rounded-full hover:border-foreground transition-colors">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedUser || !message.trim() || creating}
            className="flex items-center gap-2 px-5 py-2 font-display font-semibold text-xs bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {creating ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conversation Thread ──
function ConversationThread({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage, markConversationRead } = useMessages(conversationId);
  const { conversations } = useConversations();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conv = conversations.find(c => c.id === conversationId);

  useEffect(() => {
    markConversationRead();
  }, [conversationId, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(input);
      setInput("");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  };

  const others = conv ? getOtherParticipants(conv, user!.id) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-120px)] min-h-[500px]">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors md:hidden">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-foreground truncate">
            {conv?.subject || others.map(p => participantName(p)).join(", ") || "Conversation"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {others.map(p => {
              const Icon = USER_TYPE_ICON[p.profile.user_type] || User;
              return (
                <span key={p.user_id} className={`inline-flex items-center gap-1 text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full ${USER_TYPE_COLOR[p.profile.user_type] || ""}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {participantName(p)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs font-body text-muted-foreground">Aucun message pour l'instant</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          const senderType = msg.sender?.user_type || "client";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMe ? "order-1" : ""}`}>
                {!isMe && (
                  <p className="text-[9px] font-display font-semibold text-muted-foreground mb-0.5 flex items-center gap-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      senderType === "admin" ? "bg-red-500" : senderType === "partner" ? "bg-emerald-500" : "bg-blue-500"
                    }`} />
                    {msg.sender ? [msg.sender.first_name, msg.sender.last_name].filter(Boolean).join(" ") || msg.sender.email : "?"}
                  </p>
                )}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed ${
                  isMe
                    ? "bg-foreground text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  {msg.body}
                </div>
                <p className={`text-[9px] font-body text-muted-foreground/60 mt-0.5 ${isMe ? "text-right" : ""}`}>
                  {msg.created_at ? timeAgo(msg.created_at) : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Votre message..."
            rows={1}
            className="flex-1 bg-card border border-border rounded-2xl px-4 py-2.5 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="p-2.5 bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Messages Page ──
export default function Messages() {
  const { user } = useAuth();
  const { conversations, isLoading } = useConversations();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");

  // Check URL for direct conversation link
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/messages\/(.+)/);
    if (match) setActiveConv(match[1]);
  }, []);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    const others = getOtherParticipants(c, user!.id);
    return (
      (c.subject || "").toLowerCase().includes(s) ||
      others.some(p => participantName(p).toLowerCase().includes(s))
    );
  });

  if (!user) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                {conversations.length} conversation{conversations.length > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nouveau message
            </button>
          </div>

          <div className="flex border border-border rounded-sm overflow-hidden bg-background" style={{ minHeight: "calc(100vh - var(--header-height) - 180px)" }}>
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-border shrink-0 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <p className="text-center py-8 text-xs text-muted-foreground font-body">Chargement...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs font-body text-muted-foreground">Aucune conversation</p>
                    <button
                      onClick={() => setShowNew(true)}
                      className="mt-3 text-[10px] font-display font-semibold text-foreground underline"
                    >
                      Commencer une conversation
                    </button>
                  </div>
                ) : (
                  filtered.map(conv => {
                    const others = getOtherParticipants(conv, user.id);
                    const isActive = activeConv === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv.id)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50 transition-colors ${
                          isActive ? "bg-card" : "hover:bg-card/50"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {others[0] ? (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${USER_TYPE_COLOR[others[0].profile.user_type] || "bg-muted"}`}>
                              {(() => { const Icon = USER_TYPE_ICON[others[0].profile.user_type] || User; return <Icon className="h-3.5 w-3.5" />; })()}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-display truncate ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                              {conv.subject || others.map(p => participantName(p)).join(", ") || "Conversation"}
                            </p>
                            <span className="text-[9px] font-body text-muted-foreground whitespace-nowrap ml-2">
                              {conv.last_message_at ? timeAgo(conv.last_message_at) : ""}
                            </span>
                          </div>
                          {others.length > 0 && conv.subject && (
                            <p className="text-[10px] font-body text-muted-foreground truncate">
                              {others.map(p => participantName(p)).join(", ")}
                            </p>
                          )}
                          {conv.last_message && (
                            <p className={`text-[10px] font-body truncate mt-0.5 ${conv.unread_count > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                              {conv.last_message.body}
                            </p>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="shrink-0 w-5 h-5 rounded-full bg-foreground text-primary-foreground text-[9px] font-display font-bold flex items-center justify-center mt-1">
                            {conv.unread_count}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Main content */}
            <div className={`flex-1 ${!activeConv ? "hidden md:flex" : "flex"} flex-col`}>
              {activeConv ? (
                <ConversationThread
                  conversationId={activeConv}
                  onBack={() => setActiveConv(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="font-display font-semibold text-sm text-muted-foreground">Sélectionnez une conversation</p>
                    <p className="text-xs font-body text-muted-foreground/70 mt-1">ou créez-en une nouvelle</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onCreate={(convId) => { setShowNew(false); setActiveConv(convId); }}
        />
      )}
    </>
  );
}
