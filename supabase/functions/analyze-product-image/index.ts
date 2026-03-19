import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en mobilier outdoor professionnel CHR (Cafés, Hôtels, Restaurants).
On te donne une photo d'un produit de mobilier. Analyse l'image et retourne un JSON avec les caractéristiques détectées.

Retourne UNIQUEMENT un JSON valide, sans texte avant ou après, avec cette structure :
{
  "name": "Nom du produit en français (ex: Chaise empilable aluminium)",
  "category": "seating" | "tables" | "parasols" | "loungers" | "sofas" | "accessories",
  "subcategory": "string ou null (ex: dining-chair, armchair, bar-stool, side-table, coffee-table, parasol-center, sun-lounger...)",
  "short_description": "Description courte en français (1-2 phrases)",
  "material_structure": "Matériau principal de la structure (ex: aluminium, teck, acier, résine tressée)",
  "material_seat": "Matériau de l'assise si applicable (ex: textilène, coussin, corde, rotin)",
  "main_color": "slug couleur (white, black, grey, anthracite, natural-wood, beige, terracotta, blue, green, taupe)",
  "secondary_color": "slug couleur secondaire ou null",
  "style_tags": ["tableau de tags style : mediterranean, modern, industrial, scandinavian, coastal, tropical, classic, bohemian, minimalist, rustic, bistro, art-deco"],
  "ambience_tags": ["warm, convivial, elegant, relaxed, refined, casual, chic, cozy"],
  "material_tags": ["aluminium, teak, steel, resin-wicker, rope, fabric, polypropylene, concrete, marble, glass, wood, iron"],
  "use_case_tags": ["restaurant-terrace, rooftop, beach-club, hotel-pool, hotel-lobby, bar, cafe, garden, balcony, lounge-area"],
  "is_outdoor": true/false,
  "is_stackable": true/false,
  "is_chr_heavy_use": true/false,
  "weather_resistant": true/false,
  "uv_resistant": true/false,
  "lightweight": true/false,
  "easy_maintenance": true/false,
  "estimated_dimensions": {
    "length_cm": number ou null,
    "width_cm": number ou null,
    "height_cm": number ou null,
    "seat_height_cm": number ou null
  },
  "estimated_weight_kg": number ou null,
  "confidence": 0.0-1.0
}

Sois précis sur les matériaux et le style. Si tu n'es pas sûr d'un champ, mets null.
Pour les dimensions, donne une estimation raisonnable basée sur les proportions visibles.
Le champ "confidence" reflète ta certitude globale (0.8+ = très sûr, 0.5-0.8 = raisonnable, <0.5 = incertain).`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { image_base64, image_url, media_type = "image/jpeg" } = await req.json();

    if (!image_base64 && !image_url) {
      return new Response(
        JSON.stringify({ error: "Provide image_base64 or image_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build the image content block
    const imageContent = image_base64
      ? {
          type: "image" as const,
          source: { type: "base64" as const, media_type, data: image_base64 },
        }
      : {
          type: "image" as const,
          source: { type: "url" as const, url: image_url },
        };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              imageContent,
              { type: "text", text: "Analyse cette photo de mobilier outdoor et retourne le JSON des caractéristiques." },
            ],
          },
        ],
        system: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response", raw: text }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
