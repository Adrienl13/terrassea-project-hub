import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeProduct, type DBProduct } from "@/lib/products";
import { sanitizePostgrest } from "@/lib/sanitizePostgrest";

// ── Types ────────────────────────────────────────────────

export interface ChatAction {
  type: "view_product" | "add_to_cart" | "create_project" | "request_quote";
  label: string;
  productId?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  products?: { id: string; name: string; price: number | null; image_url?: string | null }[];
  actions?: ChatAction[];
}

// ── Hook ─────────────────────────────────────────────────

export function useChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef(crypto.randomUUID());

  // Check if chatbot is enabled via platform_settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "chatbot_enabled")
          .maybeSingle();
        if (data && data.value === "false") {
          setIsEnabled(false);
        }
      } catch {
        // If table/row doesn't exist, keep enabled by default
      }
    })();
  }, []);

  // ── Search products matching keywords ─────────────────

  const searchProducts = useCallback(
    async (text: string): Promise<DBProduct[]> => {
      // Extract meaningful keywords (3+ chars, skip stop words)
      const stopWords = new Set([
        "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "is", "are",
        "le", "la", "les", "un", "une", "des", "et", "ou", "pour", "de", "du", "en",
        "el", "los", "las", "del", "por", "para", "con",
        "il", "lo", "gli", "di", "da", "per", "che",
      ]);
      const keywords = text
        .toLowerCase()
        .replace(/[^a-z0-9àâéèêëïîôùûüçñ\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w));

      if (keywords.length === 0) return [];

      // Build ilike query — match any keyword on name or category
      const pattern = keywords.map((k) => `%${k}%`);
      let query = supabase
        .from("products")
        .select("*")
        .neq("availability_type", "discontinued")
        .order("priority_score", { ascending: false })
        .limit(10);

      // Use or filter: name ilike any keyword OR category ilike any keyword
      const orClauses = pattern
        .flatMap((p) => {
          const safe = sanitizePostgrest(p);
          return [`name.ilike.${safe}`, `category.ilike.${safe}`, `material_tags.cs.{${safe.replace(/%/g, "")}}`];
        })
        .join(",");
      query = query.or(orClauses);

      const { data, error: err } = await query;
      if (err) {
        console.warn("Chatbot product search error:", err);
        return [];
      }
      return (data ?? []).map(normalizeProduct);
    },
    []
  );

  // ── Format products as context string ─────────────────

  const formatProductContext = (products: DBProduct[]): string => {
    if (products.length === 0) return "";
    const lines = products.map(
      (p) =>
        `- ${p.name} (ID:${p.id}) — ${p.price_min != null ? `€${p.price_min}` : "price on request"} — ${p.category} — materials: ${p.material_tags.join(", ") || "n/a"} — stock: ${p.stock_status ?? "n/a"}`
    );
    return `\n\nAvailable products matching the query:\n${lines.join("\n")}`;
  };

  // ── Extract product mentions from response ────────────

  const extractProductMentions = (
    response: string,
    contextProducts: DBProduct[]
  ): ChatMessage["products"] => {
    const mentioned: ChatMessage["products"] = [];
    for (const p of contextProducts) {
      // Check if the product name (or a significant portion) appears in the response
      const nameWords = p.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      const matchCount = nameWords.filter((w) => response.toLowerCase().includes(w)).length;
      if (matchCount >= Math.max(1, Math.ceil(nameWords.length * 0.5))) {
        mentioned.push({
          id: p.id,
          name: p.name,
          price: p.price_min,
          image_url: p.image_url,
        });
      }
    }
    return mentioned.length > 0 ? mentioned : undefined;
  };

  // ── Build actions from response ───────────────────────

  const buildActions = (
    products: ChatMessage["products"]
  ): ChatAction[] | undefined => {
    if (!products || products.length === 0) return undefined;
    const actions: ChatAction[] = products.slice(0, 3).map((p) => ({
      type: "view_product" as const,
      label: p.name,
      productId: p.id,
      url: `/products/${p.id}`,
    }));
    return actions;
  };

  // ── Send message ──────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (!isEnabled) { setError("Chatbot is currently disabled."); return; }
      setError(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // 1. Fetch product context
        const contextProducts = await searchProducts(text);
        const productContext = formatProductContext(contextProducts);

        // 2. Build conversation history for the edge function
        const history = [...messages, userMsg].slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // 3. Call the chatbot edge function
        const lastUserMessage = text.trim();
        const { data, error: fnError } = await supabase.functions.invoke(
          "chatbot",
          {
            body: {
              message: lastUserMessage,
              productContext,
              conversationId,
              sessionId: sessionId.current,
              userId: user?.id ?? null,
            },
          }
        );

        if (fnError) throw fnError;

        const responseText: string =
          data?.reply ?? data?.response ?? data?.message ?? "Sorry, I couldn't process your request.";
        const newConversationId: string | null =
          data?.conversationId ?? conversationId;

        if (newConversationId) setConversationId(newConversationId);

        // 4. Parse product mentions
        const mentionedProducts = extractProductMentions(
          responseText,
          contextProducts
        );
        const actions = buildActions(mentionedProducts);

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          products: mentionedProducts,
          actions,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        console.error("Chatbot error:", err);
        setError(err?.message ?? "An error occurred");
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, conversationId, user, searchProducts]
  );

  // ── Reset ─────────────────────────────────────────────

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    isOpen,
    setIsOpen,
    isLoading,
    isEnabled,
    error,
    sendMessage,
    resetConversation,
  };
}
