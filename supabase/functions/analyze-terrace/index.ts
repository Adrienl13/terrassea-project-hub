import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert outdoor furniture consultant for hospitality professionals (hotels, restaurants, beach clubs, rooftops).

Analyze the uploaded photo of an outdoor terrace or hospitality space. Extract structured information that will be used to match products from a furniture catalog.

IMPORTANT: Only analyze outdoor/terrace spaces. If the image shows an indoor space, set "is_outdoor" to false.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "is_outdoor": true,
  "venue_type": "restaurant" | "hotel" | "beach_club" | "rooftop" | "bar" | "cafe" | "pool" | "garden" | "other",
  "style_tags": ["mediterranean", "industrial", "scandinavian", "tropical", "classic", "contemporary", "rustic", "minimalist", "bohemian", "coastal"],
  "ambience_tags": ["relaxed", "elegant", "festive", "intimate", "lively", "refined", "casual", "premium"],
  "palette_tags": ["white", "beige", "sand", "grey", "black", "blue", "navy", "green", "teak", "terracotta", "rust"],
  "material_tags": ["aluminium", "teak", "solid-wood", "woven-resin", "rope", "fabric", "polypropylene", "steel", "hpl", "ceramic", "stone"],
  "use_case_tags": ["outdoor-dining", "lounge", "poolside", "bar-area", "beach-front", "garden-terrace", "rooftop"],
  "estimated_capacity": 30,
  "space_characteristics": ["covered", "open-air", "narrow", "spacious", "multi-level", "wind-exposed", "shaded"],
  "furniture_categories_needed": ["Chairs", "Tables", "Parasols", "Sun Loungers", "Lounge Seating", "Bar Stools", "Accessories"],
  "design_summary": "A 2-3 sentence description of the space's character, atmosphere, and what furniture would complement it.",
  "color_mood": "A short phrase describing the color atmosphere, e.g. 'Warm Mediterranean whites with ocean blue accents'"
}

Only include tags that are clearly visible or strongly implied by the photo. Be specific and accurate.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { image_base64, media_type } = await req.json();

    if (!image_base64 || !media_type) {
      return new Response(JSON.stringify({ error: "Missing image_base64 or media_type" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type,
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: "Analyze this outdoor terrace photo and extract structured tags for furniture matching.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed", details: response.status }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === "text")?.text;

    if (!textContent) {
      return new Response(JSON.stringify({ error: "No analysis returned" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON response (Claude may sometimes wrap in backticks)
    const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(cleaned);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal error", message: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
