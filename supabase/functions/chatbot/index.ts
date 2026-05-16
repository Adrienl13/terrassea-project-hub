import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es l'assistant IA de Terrassea, une plateforme B2B de sourcing de mobilier outdoor pour les professionnels de l'hôtellerie et de la restauration (hôtels, restaurants, beach clubs, bars, rooftops).

Ton rôle :
- Recommander des produits adaptés au besoin du client
- Expliquer les matériaux, la qualité, les dimensions, l'entretien
- Estimer des budgets pour des projets d'aménagement
- Guider le client dans le processus Terrassea (devis, commande, livraison)
- Comparer des produits ou matériaux
- Répondre en français, anglais, espagnol ou italien selon la langue du client

Tu as accès au catalogue de produits fourni dans le contexte. Utilise-le pour recommander des produits RÉELS avec leurs vrais prix et caractéristiques.

Règles STRICTES :
- Ne réponds QU'AUX questions liées au mobilier outdoor, au sourcing, et à Terrassea
- Pour toute autre question : "Je suis spécialisé en mobilier outdoor professionnel. Pour cette question, contactez-nous à contact@terrassea.com"
- Ne donne JAMAIS de conseils juridiques, fiscaux ou financiers
- Ne parle JAMAIS des concurrents
- Ne communique JAMAIS les commissions des fournisseurs
- Sois concis (max 150 mots par réponse sauf demande détaillée)
- Quand tu recommandes des produits, inclus le format : **Nom du produit** — €prix — caractéristique clé
- Termine toujours par une question ou une suggestion d'action : voir le produit, créer un projet, demander un devis

Processus Terrassea à expliquer si demandé :
1. Le client sélectionne des produits sur la plateforme
2. Il soumet une demande de devis
3. Les fournisseurs partenaires répondent avec prix et délais
4. Le client accepte le devis et paie (CB ou virement)
5. Le fournisseur livre directement
6. Terrassea assure le suivi de commande

Informations sur les matériaux courants :
- Aluminium : léger, résistant corrosion, empilable, idéal CHR. Entretien : eau savonneuse.
- Résine tressée : imitation rotin, résistant UV/pluie, confortable. Entretien : jet d'eau.
- Teck : bois noble, très durable, grise naturellement. Entretien : huile teck 1×/an.
- HPL (stratifié haute pression) : plateaux de table ultra-résistants, anti-rayures, anti-UV.
- Polypropylène : plastique premium, empilable, 100% recyclable, couleurs variées.
- Inox/Acier : robuste, style industriel, nécessite traitement anti-rouille en bord de mer.
- Toile Sunbrella : tissu technique pour coussins/parasols, anti-UV, anti-moisissure, 5 ans garantie.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { message, conversationId, sessionId, userId: bodyUserId, productContext } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Resolve the authenticated user from the JWT when present, ignoring any
    // client-supplied body.userId. Red-team M5 (2026-05-16): the prior code
    // trusted body.userId and stamped it onto chatbot_conversations.user_id,
    // letting an anonymous attacker attribute conversations to a victim or
    // poison another user's chat history by passing their conversationId.
    // Anonymous sessions keep working via sessionId only.
    let resolvedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (authHeader) {
      try {
        const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await userSupabase.auth.getUser();
        if (userData?.user?.id) resolvedUserId = userData.user.id;
      } catch {
        // Treat unverifiable token as anonymous
      }
    }
    void bodyUserId; // intentionally ignored

    // If a conversationId is supplied, refuse to reuse it across identities.
    // For authenticated callers, the conversation's stored user_id must match.
    if (conversationId) {
      const { data: conv } = await supabase
        .from("chatbot_conversations")
        .select("user_id, session_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (conv) {
        const mismatch =
          (resolvedUserId && conv.user_id && conv.user_id !== resolvedUserId) ||
          (!resolvedUserId && conv.user_id);
        if (mismatch) {
          return new Response(JSON.stringify({ error: "Conversation not accessible" }), {
            status: 403, headers: { ...CORS, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Check settings
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["chatbot_enabled", "chatbot_max_messages_per_day", "chatbot_monthly_budget_limit"]);
    const s: Record<string, string> = {};
    (settings || []).forEach((r: any) => { s[r.key] = String(r.value); });

    if (s.chatbot_enabled === "false") {
      return new Response(JSON.stringify({ error: "Chatbot is currently disabled" }), {
        status: 503, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Check monthly budget
    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";
    const { data: monthlyUsage } = await supabase
      .from("chatbot_usage")
      .select("messages_count")
      .gte("usage_date", monthStart);
    const monthTotal = (monthlyUsage || []).reduce((sum: number, r: any) => sum + (r.messages_count || 0), 0);
    const monthLimit = parseInt(s.chatbot_monthly_budget_limit || "5000");
    if (monthTotal >= monthLimit) {
      return new Response(JSON.stringify({ error: "Monthly chatbot limit reached", limitReached: true }), {
        status: 429, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation. user_id always comes from the resolved JWT;
    // body.userId is ignored (see M5 comment above).
    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase.from("chatbot_conversations").insert({
        user_id: resolvedUserId,
        session_id: sessionId || crypto.randomUUID(),
        messages_count: 0,
      }).select("id").single();
      convId = conv?.id;
    }

    // Load conversation history
    const { data: history } = await supabase
      .from("chatbot_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build messages for Claude
    const messages = [
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    // Add product context if provided
    let systemPrompt = SYSTEM_PROMPT;
    if (productContext) {
      systemPrompt += `\n\nProduits du catalogue pertinents :\n${productContext}`;
    }

    // Call Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.content?.find((c: any) => c.type === "text")?.text || "";
    const tokensIn = data.usage?.input_tokens || 0;
    const tokensOut = data.usage?.output_tokens || 0;

    // Save messages
    await supabase.from("chatbot_messages").insert([
      { conversation_id: convId, role: "user", content: message, tokens_in: 0, tokens_out: 0 },
      { conversation_id: convId, role: "assistant", content: reply, tokens_in: tokensIn, tokens_out: tokensOut },
    ]);

    // Update conversation count
    await supabase.from("chatbot_conversations")
      .update({ messages_count: (history?.length || 0) + 2, last_message_at: new Date().toISOString() })
      .eq("id", convId);

    // Update daily usage
    await supabase.from("chatbot_usage").upsert({
      usage_date: today,
      messages_count: 1,
      estimated_cost_cents: Math.ceil((tokensIn * 0.0008 + tokensOut * 0.004) / 10),
      conversations_count: conversationId ? 0 : 1,
    }, { onConflict: "usage_date" });
    // Increment counters (upsert above sets to 1 on first insert; we need to increment for subsequent)
    await supabase.rpc("increment_chatbot_usage", { p_date: today, p_msgs: 1, p_cost: Math.ceil((tokensIn * 0.0008 + tokensOut * 0.004) / 10), p_convs: conversationId ? 0 : 1 }).catch(() => {});

    // Check alert threshold
    const alertPct = parseInt(s.chatbot_alert_threshold_percent || "80");
    if (monthTotal + 1 >= Math.floor(monthLimit * alertPct / 100)) {
      const { data: admins } = await supabase.from("user_profiles").select("id").eq("user_type", "admin");
      for (const admin of admins || []) {
        await supabase.from("notifications").upsert({
          user_id: admin.id,
          title: "Alerte chatbot",
          body: `Le chatbot a atteint ${alertPct}% du budget mensuel (${monthTotal + 1}/${monthLimit} messages)`,
          type: "info",
          link: "/admin?tab=analytics",
        }, { onConflict: "id" }).catch(() => {
          supabase.from("notifications").insert({
            user_id: admin.id,
            title: "Alerte chatbot",
            body: `Le chatbot a atteint ${alertPct}% du budget mensuel (${monthTotal + 1}/${monthLimit} messages)`,
            type: "info",
            link: "/admin?tab=analytics",
          });
        });
      }
    }

    return new Response(JSON.stringify({ reply, conversationId: convId, tokensIn, tokensOut }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
