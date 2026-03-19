import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createConversation } from "@/hooks/useConversations";
import {
  MessageSquare, Send, Search, Plus, ArrowLeft,
  User, Building2, Shield, Compass, X, Bell,
} from "lucide-react";
import { toast } from "sonner";

const USER_TYPE_ICON: Record<string, any> = {
  client: User, partner: Building2, architect: Compass, admin: Shield,
};
const USER_TYPE_LABEL: Record<string, string> = {
  client: "Client", partner: "Partenaire", architect: "Architecte", admin: "Admin",
};
const USER_TYPE_COLOR: Record<string, string> = {
  client: "text-blue-600 bg-blue-50 border-blue-200",
  partner: "text-emerald-600 bg-emerald-50 border-emerald-200",
  architect: "text-purple-600 bg-purple-50 border-purple-200",
  admin: "text-red-600 bg-red-50 border-red-200",
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

export default function AdminMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newSearch, setNewSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifData, setNotifData] = useState({ userId: "", title: "", body: "", link: "" });

  // All conversations (admin sees all)
  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ["admin_all_conversations"],
    queryFn: async () => {
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      const convIds = (convs || []).map(c => c.id);
      if (!convIds.length) return [];

      const { data: parts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", convIds);

      const userIds = [...new Set((parts || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type, company")
        .in("id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("conversation_id, body, sender_id, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });
      const lastMsgMap: Record<string, any> = {};
      (lastMsgs || []).forEach(m => { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m; });

      return (convs || []).map(c => ({
        ...c,
        participants: (parts || [])
          .filter(p => p.conversation_id === c.id)
          .map(p => ({ user_id: p.user_id, profile: profileMap[p.user_id] })),
        last_message: lastMsgMap[c.id],
      }));
    },
    refetchInterval: 15_000,
  });

  // Messages for active conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["admin_messages", activeConv],
    enabled: !!activeConv,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type")
        .in("id", senderIds as string[]);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      return (data || []).map(m => ({ ...m, sender: m.sender_id ? profileMap[m.sender_id] : null }));
    },
    refetchInterval: 10_000,
  });

  // Users for new conversation
  const { data: searchUsers = [] } = useQuery({
    queryKey: ["admin_users_search", newSearch],
    enabled: newSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type, company")
        .or(`email.ilike.%${newSearch}%,first_name.ilike.%${newSearch}%,last_name.ilike.%${newSearch}%,company.ilike.%${newSearch}%`)
        .limit(10);
      return data || [];
    },
  });

  // All users for notifications
  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin_all_users_notif"],
    enabled: showNotifForm,
    queryFn: async () => {
      const { data } = await supabase.from("user_profiles").select("id, first_name, last_name, email, user_type").order("email");
      return data || [];
    },
  });

  const filtered = conversations.filter((c: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.subject || "").toLowerCase().includes(s) ||
      c.participants.some((p: any) =>
        (p.profile?.first_name || "").toLowerCase().includes(s) ||
        (p.profile?.last_name || "").toLowerCase().includes(s) ||
        (p.profile?.email || "").toLowerCase().includes(s)
      )
    );
  });

  const handleSend = async () => {
    if (!activeConv || !input.trim() || !user) return;
    setSending(true);
    try {
      // Ensure admin is participant
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", activeConv)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("conversation_participants").insert({ conversation_id: activeConv, user_id: user.id });
      }
      await supabase.from("messages").insert({ conversation_id: activeConv, sender_id: user.id, body: input.trim() });
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["admin_messages", activeConv] });
      queryClient.invalidateQueries({ queryKey: ["admin_all_conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setSending(false);
    }
  };

  const handleCreateConv = async () => {
    if (!selectedUser || !newMessage.trim() || !user) return;
    try {
      const convId = await createConversation(
        user.id,
        [selectedUser.id],
        newSubject || `Admin - ${selectedUser.first_name || selectedUser.email}`,
        newMessage,
      );
      setShowNew(false);
      setSelectedUser(null);
      setNewSubject("");
      setNewMessage("");
      setNewSearch("");
      setActiveConv(convId);
      queryClient.invalidateQueries({ queryKey: ["admin_all_conversations"] });
      toast.success("Conversation créée");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const handleSendNotification = async () => {
    if (!notifData.userId || !notifData.title) return;
    try {
      const userIds = notifData.userId === "all"
        ? allUsers.map(u => u.id)
        : [notifData.userId];

      const inserts = userIds.map(uid => ({
        user_id: uid,
        type: "info" as const,
        title: notifData.title,
        body: notifData.body || null,
        link: notifData.link || null,
      }));

      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) throw error;
      toast.success(`Notification envoyée à ${userIds.length} utilisateur${userIds.length > 1 ? "s" : ""}`);
      setShowNotifForm(false);
      setNotifData({ userId: "", title: "", body: "", link: "" });
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const activeConvData = conversations.find((c: any) => c.id === activeConv);

  return (
    <div>
      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-foreground text-primary-foreground rounded-full hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </button>
        <button
          onClick={() => setShowNotifForm(!showNotifForm)}
          className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-border rounded-full hover:border-foreground transition-colors"
        >
          <Bell className="h-4 w-4" /> Envoyer une notification
        </button>
      </div>

      {/* Notification form */}
      {showNotifForm && (
        <div className="bg-card border border-border rounded-sm p-5 mb-5 space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Envoyer une notification</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Destinataire</label>
              <select
                value={notifData.userId}
                onChange={e => setNotifData(p => ({ ...p, userId: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="">Choisir...</option>
                <option value="all">Tous les utilisateurs</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email} ({USER_TYPE_LABEL[u.user_type] || u.user_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground block mb-1">Titre</label>
              <input
                value={notifData.title}
                onChange={e => setNotifData(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Message (optionnel)</label>
            <input
              value={notifData.body}
              onChange={e => setNotifData(p => ({ ...p, body: e.target.value }))}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Lien (optionnel)</label>
            <input
              value={notifData.link}
              onChange={e => setNotifData(p => ({ ...p, link: e.target.value }))}
              placeholder="/products, /messages, ..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSendNotification} disabled={!notifData.userId || !notifData.title}
              className="flex items-center gap-2 px-5 py-2 font-display font-semibold text-xs bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50">
              <Send className="h-3 w-3" /> Envoyer
            </button>
            <button onClick={() => setShowNotifForm(false)}
              className="px-4 py-2 font-display font-semibold text-xs border border-border rounded-full hover:border-foreground transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* New conversation modal */}
      {showNew && (
        <div className="bg-card border border-border rounded-sm p-5 mb-5 space-y-3">
          <h3 className="font-display font-semibold text-sm text-foreground">Nouvelle conversation</h3>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Destinataire</label>
            {selectedUser ? (
              <div className="flex items-center gap-2 bg-background border border-border rounded-sm px-3 py-2">
                <span className="text-sm font-body flex-1">
                  {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(" ") || selectedUser.email}
                </span>
                <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full border ${USER_TYPE_COLOR[selectedUser.user_type] || ""}`}>
                  {USER_TYPE_LABEL[selectedUser.user_type]}
                </span>
                <button onClick={() => setSelectedUser(null)}><X className="h-3 w-3 text-muted-foreground" /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input value={newSearch} onChange={e => setNewSearch(e.target.value)} placeholder="Rechercher..."
                  className="w-full bg-background border border-border rounded-sm pl-9 pr-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
                {searchUsers.length > 0 && newSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border rounded-sm shadow-md mt-1 max-h-48 overflow-y-auto">
                    {searchUsers.map(u => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setNewSearch(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-card text-xs font-body">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                        <span className={`text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full border ${USER_TYPE_COLOR[u.user_type] || ""}`}>
                          {USER_TYPE_LABEL[u.user_type]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Sujet</label>
            <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">Message</label>
            <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateConv} disabled={!selectedUser || !newMessage.trim()}
              className="flex items-center gap-2 px-5 py-2 font-display font-semibold text-xs bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50">
              <Send className="h-3 w-3" /> Créer
            </button>
            <button onClick={() => { setShowNew(false); setSelectedUser(null); }}
              className="px-4 py-2 font-display font-semibold text-xs border border-border rounded-full hover:border-foreground transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Conversation list + thread */}
      <div className="flex border border-border rounded-sm overflow-hidden" style={{ minHeight: 500 }}>
        {/* Sidebar */}
        <div className={`w-72 border-r border-border shrink-0 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="w-full bg-card border border-border rounded-sm pl-8 pr-2 py-1.5 text-xs font-body outline-none focus:ring-1 focus:ring-foreground" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <p className="text-center py-8 text-xs text-muted-foreground">Chargement...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">Aucune conversation</p>
            ) : (
              filtered.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors ${activeConv === conv.id ? "bg-card" : "hover:bg-card/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-display font-semibold text-foreground truncate">{conv.subject || "Sans sujet"}</p>
                    <span className="text-[9px] text-muted-foreground">{conv.last_message_at ? timeAgo(conv.last_message_at) : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {conv.participants.slice(0, 3).map((p: any) => (
                      <span key={p.user_id} className={`text-[8px] font-display font-semibold px-1 py-0.5 rounded-full border ${USER_TYPE_COLOR[p.profile?.user_type || "client"]}`}>
                        {p.profile?.first_name || p.profile?.email?.split("@")[0] || "?"}
                      </span>
                    ))}
                  </div>
                  {conv.last_message && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.last_message.body}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`flex-1 flex flex-col ${!activeConv ? "hidden md:flex" : "flex"}`}>
          {activeConv && activeConvData ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <button onClick={() => setActiveConv(null)} className="md:hidden text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                  <p className="font-display font-semibold text-sm">{activeConvData.subject || "Conversation"}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(activeConvData as any).participants.map((p: any) => (
                      <span key={p.user_id} className={`text-[8px] font-display font-semibold px-1 py-0.5 rounded-full border ${USER_TYPE_COLOR[p.profile?.user_type || "client"]}`}>
                        {p.profile ? [p.profile.first_name, p.profile.last_name].filter(Boolean).join(" ") || p.profile.email : "?"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                {messages.map((m: any) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[70%]">
                        {!isMe && (
                          <p className="text-[9px] font-display font-semibold text-muted-foreground mb-0.5">
                            {m.sender ? [m.sender.first_name, m.sender.last_name].filter(Boolean).join(" ") || m.sender.email : "?"}
                          </p>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm font-body ${
                          isMe ? "bg-foreground text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"
                        }`}>
                          {m.body}
                        </div>
                        <p className={`text-[9px] text-muted-foreground/60 mt-0.5 ${isMe ? "text-right" : ""}`}>
                          {m.created_at ? timeAgo(m.created_at) : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-t border-border shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Répondre..."
                    rows={1}
                    className="flex-1 bg-card border border-border rounded-2xl px-4 py-2 text-sm font-body outline-none focus:ring-1 focus:ring-foreground resize-none"
                  />
                  <button onClick={handleSend} disabled={!input.trim() || sending}
                    className="p-2.5 bg-foreground text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 shrink-0">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm font-display text-muted-foreground">Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
