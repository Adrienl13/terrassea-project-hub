import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string; // "quote_reply", "cart_reminder", "order_update", "review_request", "message", etc.
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

/* Map DB row (which may use body/link/read_at columns) to our AppNotification shape */
function toAppNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    message: (row.body as string) ?? (row.message as string) ?? "",
    type: (row.type as string) ?? "info",
    action_url: (row.link as string) ?? (row.action_url as string) ?? null,
    is_read: row.read_at != null || (row.is_read as boolean) === true,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    ...rest
  } = useQuery<AppNotification[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((r: Record<string, unknown>) => toAppNotification(r));
    },
    refetchInterval: 30_000,
  });

  // Realtime subscription — instant push + toast
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Optimistically prepend the new notification
          const incoming = toAppNotification(payload.new as Record<string, unknown>);

          queryClient.setQueryData<AppNotification[]>(
            ["notifications", user.id],
            (prev = []) => [incoming, ...prev].slice(0, 20)
          );

          // Show a toast for the new notification
          toast({
            title: incoming.title,
            description: incoming.message || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", id);

      queryClient.setQueryData<AppNotification[]>(
        ["notifications", user?.id],
        (prev = []) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    [user?.id, queryClient]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("user_id", user.id)
      .is("read_at", null);

    queryClient.setQueryData<AppNotification[]>(
      ["notifications", user.id],
      (prev = []) => prev.map((n) => ({ ...n, is_read: true }))
    );
  }, [user?.id, queryClient]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, ...rest };
}
