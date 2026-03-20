import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type ConversationSummary = {
  id: string;
  subject: string | null;
  project_ref: string | null;
  project_name: string | null;
  last_message_at: string | null;
  created_at: string | null;
  // joined data
  participants: {
    user_id: string;
    last_read_at: string | null;
    profile: {
      first_name: string | null;
      last_name: string | null;
      email: string;
      user_type: string;
      company: string | null;
    };
  }[];
  last_message?: {
    body: string;
    sender_id: string | null;
    created_at: string | null;
  };
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string | null;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    user_type: string;
  };
};

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], ...rest } = useQuery<ConversationSummary[]>({
    queryKey: ["conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get conversations where user is participant
      const { data: participations, error: pErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);
      if (pErr) throw pErr;
      if (!participations?.length) return [];

      const convIds = participations.map(p => p.conversation_id);
      const myReadMap: Record<string, string | null> = {};
      participations.forEach(p => { myReadMap[p.conversation_id] = p.last_read_at; });

      // Get conversations
      const { data: convs, error: cErr } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("last_message_at", { ascending: false });
      if (cErr) throw cErr;

      // Get all participants for these conversations
      const { data: allParts, error: apErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", convIds);
      if (apErr) throw apErr;

      const partUserIds = [...new Set((allParts || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type, company")
        .in("id", partUserIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      // Get last message per conversation
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("conversation_id, body, sender_id, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMsgMap: Record<string, any> = {};
      (lastMsgs || []).forEach(m => {
        if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
      });

      // Count unread per conversation
      const unreadMap: Record<string, number> = {};
      for (const convId of convIds) {
        const lastRead = myReadMap[convId];
        if (!lastRead) {
          // Never read => count all messages not from me
          const count = (lastMsgs || []).filter(
            m => m.conversation_id === convId && m.sender_id !== user!.id
          ).length;
          unreadMap[convId] = count;
        } else {
          const count = (lastMsgs || []).filter(
            m => m.conversation_id === convId && m.sender_id !== user!.id && m.created_at && m.created_at > lastRead
          ).length;
          unreadMap[convId] = count;
        }
      }

      return (convs || []).map(c => ({
        id: c.id,
        subject: c.subject,
        project_ref: (c as any).project_ref || null,
        project_name: (c as any).project_name || null,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        participants: (allParts || [])
          .filter(p => p.conversation_id === c.id)
          .map(p => ({
            user_id: p.user_id,
            last_read_at: p.last_read_at,
            profile: profileMap[p.user_id] || { first_name: null, last_name: null, email: "?", user_type: "client", company: null },
          })),
        last_message: lastMsgMap[c.id] || undefined,
        unread_count: unreadMap[c.id] || 0,
      }));
    },
    refetchInterval: 15_000,
  });

  // Realtime for new messages
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return { conversations, totalUnread, ...rest };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], ...rest } = useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, user_type")
        .in("id", senderIds as string[]);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      return (data || []).map(m => ({
        ...m,
        sender: m.sender_id ? profileMap[m.sender_id] : undefined,
      }));
    },
    refetchInterval: 10_000,
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id, queryClient]);

  const sendMessage = async (body: string) => {
    if (!conversationId || !user?.id || !body.trim()) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
    });
    if (error) throw error;

    // Mark as read
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
  };

  const markConversationRead = async () => {
    if (!conversationId || !user?.id) return;
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
  };

  return { messages, sendMessage, markConversationRead, ...rest };
}

export async function createConversation(
  creatorId: string,
  participantIds: string[],
  subject: string,
  firstMessage?: string,
  projectRef?: string,
  projectName?: string,
) {
  // Create conversation
  const insertPayload: any = { subject, created_by: creatorId };
  if (projectRef) insertPayload.project_ref = projectRef;
  if (projectName) insertPayload.project_name = projectName;
  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .insert(insertPayload)
    .select("id")
    .single();
  if (cErr) throw cErr;

  // Add all participants (including creator)
  const allIds = [...new Set([creatorId, ...participantIds])];
  const { error: pErr } = await supabase
    .from("conversation_participants")
    .insert(allIds.map(uid => ({ conversation_id: conv.id, user_id: uid })));
  if (pErr) throw pErr;

  // Send first message if provided
  if (firstMessage?.trim()) {
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: creatorId,
      body: firstMessage.trim(),
    });
  }

  return conv.id;
}
