import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://terrassea.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function requireAdmin(req: Request): Promise<string | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  const { data: profile } = await supabase
    .from("user_profiles").select("user_type").eq("id", user.id).single();
  if (profile?.user_type !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  return user.id;
}

const SYSTEM_PROMPT = `Tu es un expert en mobilier outdoor professionnel CHR (Cafés, Hôtels, Restaurants).
On te donne une photo d'un produit de mobilier. Analyse l'image et retourne un JSON avec les caractéristiques détectées.

Retourne UNIQUEMENT un JSON valide, sans texte avant ou après, avec cette structure :
{
  "name": "Nom du produit en français (ex: Chaise empilable aluminium)",
  "category": "seating" | "tables" | "parasols" | "loungers" | "sofas" | "accessories",
  "subcategory": "string ou null",
  "short_description": "Description courte en français (1-2 phrases)",
  "material_structure": "Matériau principal",
  "material_seat": "Matériau assise ou null",
  "main_color": "slug couleur",
  "secondary_color": "slug ou null",
  "style_tags": ["mediterranean", "modern", ...],
  "ambience_tags": ["warm", "elegant", ...],
  "material_tags": ["aluminium", "teak", ...],
  "use_case_tags": ["restaurant-terrace", ...],
  "is_outdoor": true,
  "is_stackable": true/false,
  "is_chr_heavy_use": true/false,
  "weather_resistant": true/false,
  "uv_resistant": true/false,
  "lightweight": true/false,
  "easy_maintenance": true/false,
  "estimated_dimensions": { "length_cm": null, "width_cm": null, "height_cm": null, "seat_height_cm": null },
  "estimated_weight_kg": null,
  "confidence": 0.0-1.0
}
Sois précis. Si incertain, mets null. Le champ confidence reflète ta certitude globale.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Auth: admin only
  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof Response) return adminCheck;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { image_base64, image_url, media_type = "image/jpeg" } = await req.json();

    if (!image_base64 && !image_url) {
      return new Response(JSON.stringify({ error: "Provide image_base64 or image_url" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const imageContent = image_base64
      ? { type: "image" as const, source: { type: "base64" as const, media_type, data: image_base64 } }
      : { type: "image" as const, source: { type: "url" as const, url: image_url } };

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
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            imageContent,
            { type: "text", text: "Analyse cette photo de mobilier outdoor et retourne le JSON des caractéristiques." },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText }), {
        status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw: text }), {
        status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
