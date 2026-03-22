import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bot, Power, MessageSquare, Calendar, TrendingUp,
  DollarSign, Settings, ChevronDown, ChevronUp,
  ShoppingCart, FileText, FolderOpen, Save,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatbotSettings {
  chatbot_enabled: boolean;
  max_messages_per_user_per_day: number;
  monthly_budget_limit: number;
  alert_threshold_percent: number;
}

interface DailyStats {
  date: string;
  messages: number;
}

interface ConversationSummary {
  id: string;
  userEmail: string | null;
  messageCount: number;
  startedAt: string;
  endedAt: string | null;
  ledToCart: boolean;
  ledToQuote: boolean;
  ledToProject: boolean;
  messages: { role: string; content: string; createdAt: string }[];
}

// ── Helper: safe Supabase query (tables may not exist yet) ─────────────────

async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: any }>): Promise<T | null> {
  try {
    const { data, error } = await fn();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminChatbotStats() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  // ── Settings ──
  const { data: settings } = useQuery({
    queryKey: ["chatbot-settings"],
    queryFn: async (): Promise<ChatbotSettings> => {
      const row = await safeQuery(() =>
        supabase.from("platform_settings").select("*").eq("key", "chatbot").single()
      );
      if (row && typeof (row as any).value === "object") {
        const v = (row as any).value as Record<string, any>;
        return {
          chatbot_enabled: v.chatbot_enabled ?? true,
          max_messages_per_user_per_day: v.max_messages_per_user_per_day ?? 50,
          monthly_budget_limit: v.monthly_budget_limit ?? 100,
          alert_threshold_percent: v.alert_threshold_percent ?? 80,
        };
      }
      return { chatbot_enabled: true, max_messages_per_user_per_day: 50, monthly_budget_limit: 100, alert_threshold_percent: 80 };
    },
  });

  const [form, setForm] = useState<ChatbotSettings>({
    chatbot_enabled: true,
    max_messages_per_user_per_day: 50,
    monthly_budget_limit: 100,
    alert_threshold_percent: 80,
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (s: ChatbotSettings) => {
      await supabase.from("platform_settings").upsert({
        key: "chatbot",
        value: s as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatbot-settings"] });
      toast.success(t("adminChatbot.settingsSaved"));
    },
  });

  const toggleEnabled = useCallback(async () => {
    const next = { ...form, chatbot_enabled: !form.chatbot_enabled };
    setForm(next);
    saveMutation.mutate(next);
  }, [form, saveMutation]);

  // ── Usage stats ──
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const { data: todayStats } = useQuery({
    queryKey: ["chatbot-today-stats", today],
    queryFn: async () => {
      const rows = await safeQuery(() =>
        supabase.from("chatbot_usage").select("messages_count, session_id").gte("created_at", today + "T00:00:00")
      );
      if (!rows || !Array.isArray(rows)) return { messages: 0, conversations: 0 };
      const messages = (rows as any[]).reduce((s: number, r: any) => s + (r.messages_count || 1), 0);
      const sessions = new Set((rows as any[]).map((r: any) => r.session_id)).size;
      return { messages, conversations: sessions || rows.length };
    },
  });

  const { data: monthStats } = useQuery({
    queryKey: ["chatbot-month-stats", monthStart],
    queryFn: async () => {
      const rows = await safeQuery(() =>
        supabase.from("chatbot_usage").select("messages_count").gte("created_at", monthStart + "T00:00:00")
      );
      if (!rows || !Array.isArray(rows)) return { messages: 0 };
      const messages = (rows as any[]).reduce((s: number, r: any) => s + (r.messages_count || 1), 0);
      return { messages };
    },
  });

  const { data: conversionStats } = useQuery({
    queryKey: ["chatbot-conversions", monthStart],
    queryFn: async () => {
      const convs = await safeQuery(() =>
        supabase.from("chatbot_conversations").select("id, led_to_cart, led_to_quote, led_to_project").gte("created_at", monthStart + "T00:00:00")
      );
      if (!convs || !Array.isArray(convs)) return { total: 0, converted: 0 };
      const total = convs.length;
      const converted = (convs as any[]).filter((c: any) => c.led_to_cart || c.led_to_quote || c.led_to_project).length;
      return { total, converted };
    },
  });

  const { data: dailyData = [] } = useQuery({
    queryKey: ["chatbot-daily", monthStart],
    queryFn: async (): Promise<DailyStats[]> => {
      const rows = await safeQuery(() =>
        supabase.from("chatbot_usage").select("created_at, messages_count").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      );
      if (!rows || !Array.isArray(rows)) return [];
      const byDay: Record<string, number> = {};
      for (const r of rows as any[]) {
        const day = (r.created_at as string).slice(0, 10);
        byDay[day] = (byDay[day] || 0) + (r.messages_count || 1);
      }
      const result: DailyStats[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        result.push({ date: d, messages: byDay[d] || 0 });
      }
      return result;
    },
  });

  const { data: recentConvs = [] } = useQuery({
    queryKey: ["chatbot-recent-convs"],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const rows = await safeQuery(() =>
        supabase.from("chatbot_conversations")
          .select("id, user_email, message_count, created_at, ended_at, led_to_cart, led_to_quote, led_to_project")
          .order("created_at", { ascending: false })
          .limit(10)
      );
      if (!rows || !Array.isArray(rows)) return [];
      return (rows as any[]).map((r: any) => ({
        id: r.id,
        userEmail: r.user_email,
        messageCount: r.message_count || 0,
        startedAt: r.created_at,
        endedAt: r.ended_at,
        ledToCart: !!r.led_to_cart,
        ledToQuote: !!r.led_to_quote,
        ledToProject: !!r.led_to_project,
        messages: [],
      }));
    },
  });

  // Expand conversation
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<any[]>([]);

  const loadMessages = useCallback(async (convId: string) => {
    if (expandedConvId === convId) {
      setExpandedConvId(null);
      return;
    }
    setExpandedConvId(convId);
    const rows = await safeQuery(() =>
      supabase.from("chatbot_messages").select("role, content, created_at").eq("conversation_id", convId).order("created_at", { ascending: true })
    );
    setExpandedMessages(rows && Array.isArray(rows) ? rows : []);
  }, [expandedConvId]);

  // Computed
  const monthMessages = monthStats?.messages ?? 0;
  const monthLimit = 5000;
  const monthPercent = Math.min(100, Math.round((monthMessages / monthLimit) * 100));
  const costPerMessage = 0.003;
  const estimatedCost = (monthMessages * costPerMessage).toFixed(2);
  const convRate = conversionStats && conversionStats.total > 0
    ? Math.round((conversionStats.converted / conversionStats.total) * 100)
    : 0;
  const maxBar = Math.max(...dailyData.map(d => d.messages), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-5 w-5 text-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">
            {t("adminChatbot.title")}
          </h2>
        </div>
        <button
          onClick={toggleEnabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-display font-semibold transition-colors ${
            form.chatbot_enabled
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          {form.chatbot_enabled ? t("adminChatbot.enabled") : t("adminChatbot.disabled")}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("adminChatbot.today")}
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            {todayStats?.messages ?? 0}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {t("adminChatbot.messages")}
            </span>
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {todayStats?.conversations ?? 0} {t("adminChatbot.conversations")}
          </p>
        </div>

        {/* This month */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("adminChatbot.thisMonth")}
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            {monthMessages}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              / {monthLimit.toLocaleString()} {t("adminChatbot.messages")}
            </span>
          </p>
          <div className="w-full h-2 bg-muted/30 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                monthPercent >= 90 ? "bg-red-500" : monthPercent >= 70 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${monthPercent}%` }}
            />
          </div>
          <p className="text-[10px] font-body text-muted-foreground mt-1">{monthPercent}%</p>
        </div>

        {/* Estimated cost */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("adminChatbot.estimatedCost")}
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            {estimatedCost}
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {t("adminChatbot.thisMonth")}
          </p>
        </div>

        {/* Conversion */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
              {t("adminChatbot.conversionRate")}
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            {convRate}%
          </p>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5">
            {conversionStats?.converted ?? 0} / {conversionStats?.total ?? 0} {t("adminChatbot.conversations")}
          </p>
        </div>
      </div>

      {/* Daily chart (last 30 days) */}
      <div className="border border-border rounded-lg p-5">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("adminChatbot.dailyChart")}
        </p>
        <div className="flex items-end gap-[3px] h-32">
          {dailyData.map((d) => (
            <div
              key={d.date}
              className="flex-1 group relative"
              title={`${d.date}: ${d.messages} msgs`}
            >
              <div
                className="w-full bg-foreground/20 hover:bg-foreground/40 rounded-sm transition-colors"
                style={{ height: `${Math.max(2, (d.messages / maxBar) * 100)}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-foreground text-background text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.date.slice(5)}: {d.messages}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] font-body text-muted-foreground">{dailyData[0]?.date.slice(5)}</span>
          <span className="text-[9px] font-body text-muted-foreground">{dailyData[dailyData.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Settings panel */}
      <div className="border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
            {t("adminChatbot.settings")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">
              {t("adminChatbot.maxMessagesPerDay")}
            </label>
            <input
              type="number"
              value={form.max_messages_per_user_per_day}
              onChange={(e) => setForm({ ...form, max_messages_per_user_per_day: parseInt(e.target.value) || 0 })}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">
              {t("adminChatbot.monthlyBudgetLimit")}
            </label>
            <input
              type="number"
              value={form.monthly_budget_limit}
              onChange={(e) => setForm({ ...form, monthly_budget_limit: parseFloat(e.target.value) || 0 })}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground block mb-1">
              {t("adminChatbot.alertThreshold")}
            </label>
            <input
              type="number"
              value={form.alert_threshold_percent}
              onChange={(e) => setForm({ ...form, alert_threshold_percent: parseInt(e.target.value) || 0 })}
              className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-sm text-xs font-display font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {t("adminChatbot.save")}
          </button>
        </div>
      </div>

      {/* Recent conversations */}
      <div className="border border-border rounded-lg p-5">
        <p className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          {t("adminChatbot.recentConversations")}
        </p>

        {recentConvs.length === 0 ? (
          <p className="text-xs font-body text-muted-foreground italic">{t("adminChatbot.noConversations")}</p>
        ) : (
          <div className="space-y-2">
            {recentConvs.map((conv) => (
              <div key={conv.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => loadMessages(conv.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-display font-semibold text-foreground truncate">
                      {conv.userEmail || t("adminChatbot.anonymous")}
                    </span>
                    <span className="text-[10px] font-body text-muted-foreground">
                      {conv.messageCount} {t("adminChatbot.messages")}
                    </span>
                    <span className="text-[10px] font-body text-muted-foreground/60">
                      {conv.endedAt
                        ? `${Math.round((new Date(conv.endedAt).getTime() - new Date(conv.startedAt).getTime()) / 60000)} min`
                        : t("adminChatbot.ongoing")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {conv.ledToCart && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-display font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <ShoppingCart className="h-2.5 w-2.5" /> {t("adminChatbot.cart")}
                      </span>
                    )}
                    {conv.ledToQuote && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-display font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        <FileText className="h-2.5 w-2.5" /> {t("adminChatbot.quote")}
                      </span>
                    )}
                    {conv.ledToProject && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-display font-semibold uppercase px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        <FolderOpen className="h-2.5 w-2.5" /> {t("adminChatbot.project")}
                      </span>
                    )}
                    {expandedConvId === conv.id ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedConvId === conv.id && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
                    {expandedMessages.length === 0 ? (
                      <p className="text-xs font-body text-muted-foreground italic">
                        {t("adminChatbot.noMessages")}
                      </p>
                    ) : (
                      expandedMessages.map((msg: any, idx: number) => (
                        <div
                          key={idx}
                          className={`text-xs font-body p-2 rounded ${
                            msg.role === "assistant"
                              ? "bg-foreground/5 text-foreground"
                              : "bg-blue-50 text-blue-900"
                          }`}
                        >
                          <span className="text-[9px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                            {msg.role === "assistant" ? "Bot" : t("adminChatbot.user")}
                          </span>
                          <p className="mt-0.5">{msg.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
