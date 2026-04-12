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

const SYSTEM_PROMPT = `Tu es un expert en mobilier outdoor professionnel CHR (Cafés, Hôtels, Restaurants) et en optimisation de fiches produit pour le e-commerce B2B.

On te donne les données actuelles d'un ou plusieurs produits de mobilier outdoor. Ton objectif est d'analyser chaque produit et de proposer des AMÉLIORATIONS CONCRÈTES pour enrichir les données manquantes ou insuffisantes.

RÈGLES CRITIQUES :
- Ne modifie JAMAIS les données existantes correctes — propose uniquement des AJOUTS
- Si un champ est déjà bien rempli, ne le propose pas
- Chaque suggestion doit avoir un champ "confidence" (0.0-1.0) et une "reason" explicative
- Base tes suggestions sur : le nom du produit, sa catégorie, ses matériaux, sa description, et son image si fournie
- Pour les tags, utilise UNIQUEMENT les slugs valides fournis ci-dessous

SLUGS VALIDES POUR LES TAGS :
- style_tags: mediterranean, modern, industrial, classic, scandinavian, vintage, bohemian, minimal, luxury, art-deco, colonial, coastal, rustic, tropical, contemporary, traditional, organic, nautical, resort, urban
- ambience_tags: warm, elegant, casual, refined, playful, serene, vibrant, minimal, cozy, sophisticated, festive, intimate, relaxed, chic, dramatic
- material_tags: aluminium, teak, rope, steel, wood, fabric, resin-wicker, textilene, glass, concrete, bamboo, iron, polypropylene, polyester, acacia, eucalyptus, ceramic, marble, hpl, compact-laminate, stainless-steel, synthetic-rattan
- use_case_tags: restaurant-terrace, beach-club, pool-deck, hotel-patio, hotel-garden, rooftop, spa-wellness, event-dining, cafe-bistro, bar-lounge, resort-pool, yacht-deck, private-garden, wedding-venue, seaside-restaurant
- technical_tags: marine-grade, fire-retardant, chr-heavy-use, uv-resistant, anti-corrosion, recyclable, eco-certified, quick-dry, anti-slip, wind-resistant
- palette_tags: neutral, warm-earth, cool-blues, jewel-tones, pastels, tropical, monochrome, natural-tones, coastal, earth-clay
- color slugs (pour main_color/secondary_color): white, off-white, cream, ivory, sand, natural, beige, champagne, taupe, grey, graphite, charcoal, anthracite, black, teak, walnut, dark-brown, chocolate, terracotta, rust, copper, red, bordeaux, mustard, gold, yellow, olive, sage, green, navy, petrol, blue, blush, silver, bronze

SLUGS VALIDES POUR CATEGORY :
Chairs, Armchairs, Tables, Bar Stools, Parasols, Lounge Seating, Sun Loungers, Benches, Coffee Tables, High Tables, Sofas, Accessories

CHAMPS ENRICHISSABLES :
- style_tags (string[]) : tags de style à AJOUTER à ceux existants
- ambience_tags (string[]) : tags d'ambiance à ajouter
- palette_tags (string[]) : tags de palette à ajouter
- material_tags (string[]) : tags matériaux à ajouter
- use_case_tags (string[]) : tags cas d'usage à ajouter
- technical_tags (string[]) : tags techniques à ajouter
- short_description (string) : description courte si absente ou trop courte (<20 chars)
- long_description (string) : description longue si absente ou trop courte (<50 chars)
- short_description_fr (string) : traduction FR si absente (même logique pour _es, _it)
- long_description_fr (string) : traduction FR si absente (même logique pour _es, _it)
- main_color (string) : couleur principale si absente
- secondary_color (string) : couleur secondaire si détectable
- available_colors (string[]) : couleurs disponibles si détectables depuis le nom/description
- is_outdoor (boolean), is_stackable (boolean), is_chr_heavy_use (boolean)
- uv_resistant (boolean), weather_resistant (boolean), fire_retardant (boolean)
- lightweight (boolean), easy_maintenance (boolean)
- subcategory (string) : sous-catégorie si absente
- product_type_tags (object) : champs spécifiques au type de produit — STRUCTURE PAR CATÉGORIE :
  * Chairs/Armchairs/Bar Stools: { silhouette: "bistrot"|"4-leg"|"sled"|"cross-back"|"shell"|"ghost"|"cantilever"|"tulip"|"lounge", frame_material: string, seat_type: string, arm_type: "with-arms"|"armless"|null, back_height: "low"|"mid"|"high", comfort_tier: "basic"|"comfort"|"premium", cushion_type: string|null }
  * Tables/Coffee Tables/High Tables: { table_type: "complete"|"base-only"|"top-only", shape: "round"|"square"|"rectangular"|"oval", top_material: string, base_type: "4-leg"|"central"|"trestle"|"pedestal", height_type: "standard"|"bar"|"coffee"|"adjustable", edge_finish: string|null, capacity_covers: number }
  * Parasols: { parasol_type: "central"|"deported"|"wall-mounted", pole_material: string, fabric_material: string, opening_type: "crank"|"push-up"|"pulley", tilt_type: "none"|"manual"|"auto" }
  * Sun Loungers: { positions: number, has_wheels: boolean, has_towel_bar: boolean, has_side_table: boolean }
  * Sofas/Lounge Seating: { is_modular: boolean, seats: number, has_chaise: boolean }
  * Accessories: { accessory_type: string }

FORMAT DE RÉPONSE — retourne UNIQUEMENT un JSON valide :
{
  "suggestions": [
    {
      "product_id": "uuid-du-produit",
      "fields": {
        "nom_du_champ": {
          "action": "add" | "replace",
          "current_value": <valeur actuelle ou null>,
          "suggested_value": <valeur suggérée>,
          "confidence": 0.0-1.0,
          "reason": "Explication courte de pourquoi cette suggestion"
        }
      }
    }
  ]
}

Pour les tags (arrays), "action" est toujours "add" et "suggested_value" contient UNIQUEMENT les nouveaux tags à ajouter (pas ceux déjà présents).
Pour les champs texte vides, "action" est "add".
Pour les champs texte insuffisants, "action" est "replace".
Ne propose rien si le produit est déjà complet et de bonne qualité.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const adminCheck = await requireAdmin(req);
  if (adminCheck instanceof Response) return adminCheck;

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(JSON.stringify({ error: "Provide a products array" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Build compact product summaries for Claude (limit data sent)
    const productSummaries = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      subcategory: p.subcategory,
      short_description: p.short_description,
      short_description_fr: p.short_description_fr,
      short_description_es: p.short_description_es,
      short_description_it: p.short_description_it,
      long_description: p.long_description,
      long_description_fr: p.long_description_fr,
      long_description_es: p.long_description_es,
      long_description_it: p.long_description_it,
      material_structure: p.material_structure,
      material_seat: p.material_seat,
      main_color: p.main_color,
      secondary_color: p.secondary_color,
      available_colors: p.available_colors || [],
      style_tags: p.style_tags || [],
      ambience_tags: p.ambience_tags || [],
      palette_tags: p.palette_tags || [],
      material_tags: p.material_tags || [],
      use_case_tags: p.use_case_tags || [],
      technical_tags: p.technical_tags || [],
      is_outdoor: p.is_outdoor,
      is_stackable: p.is_stackable,
      is_chr_heavy_use: p.is_chr_heavy_use,
      uv_resistant: p.uv_resistant,
      weather_resistant: p.weather_resistant,
      fire_retardant: p.fire_retardant,
      lightweight: p.lightweight,
      easy_maintenance: p.easy_maintenance,
      image_url: p.image_url,
      product_type_tags: p.product_type_tags || {},
      collection: p.collection,
      brand_source: p.brand_source,
      dimensions_length_cm: p.dimensions_length_cm,
      dimensions_width_cm: p.dimensions_width_cm,
      dimensions_height_cm: p.dimensions_height_cm,
      weight_kg: p.weight_kg,
      data_quality_score: p.data_quality_score,
    }));

    const userMessage = `Voici ${productSummaries.length} produit(s) de mobilier outdoor à analyser et enrichir.\n\nDonnées actuelles :\n${JSON.stringify(productSummaries, null, 2)}\n\nAnalyse chaque produit et propose des améliorations. Retourne le JSON des suggestions.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
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

    return new Response(JSON.stringify({ success: true, ...analysis }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Enrich error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
