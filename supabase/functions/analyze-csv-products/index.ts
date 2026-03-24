import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en mobilier outdoor professionnel CHR (Cafés, Hôtels, Restaurants) et en traitement de données produit.

On te donne les en-têtes d'un fichier CSV et quelques lignes d'exemple provenant du catalogue d'un fournisseur de mobilier. Le fichier peut avoir n'importe quel format de colonnes, dans n'importe quelle langue.

Ta mission :
1. COMPRENDRE ce que chaque colonne du CSV représente, même si les noms sont abrégés, dans une autre langue, ou non standards
2. MAPPER chaque colonne vers les champs de notre base de données produit
3. TRANSFORMER les données de chaque ligne en un objet produit structuré et enrichi

Champs de notre base de données (tous optionnels sauf name et category) :
- name (string) : nom du produit
- category (string) : DOIT être un de: "Chairs", "Armchairs", "Tables", "Bar Stools", "Parasols", "Lounge Seating", "Sun Loungers", "Benches", "Coffee Tables", "High Tables", "Sofas", "Accessories"
- subcategory (string|null)
- short_description (string|null) : 1-2 phrases en français
- long_description (string|null) : description détaillée en français
- material_structure (string|null) : matériau principal de la structure
- material_seat (string|null) : matériau de l'assise
- main_color (string|null) : slug couleur parmi: white, off-white, cream, ivory, sand, natural, beige, champagne, taupe, grey, graphite, charcoal, anthracite, black, teak, walnut, dark-brown, chocolate, terracotta, rust, copper, red, bordeaux, mustard, gold, yellow, olive, sage, green, navy, petrol, blue, blush, silver, bronze
- secondary_color (string|null)
- available_colors (string[]) : liste de slugs couleur si le produit existe en plusieurs coloris
- style_tags (string[]) : ex. ["mediterranean", "modern", "industrial", "classic"]
- ambience_tags (string[]) : ex. ["warm", "elegant", "casual", "refined"]
- material_tags (string[]) : ex. ["aluminium", "teak", "resin-wicker", "textilene"]
- use_case_tags (string[]) : ex. ["restaurant-terrace", "hotel-pool", "beach-club"]
- technical_tags (string[]) : ex. ["marine-grade", "fire-retardant"]
- price_min (number|null) : prix HT minimum
- price_max (number|null) : prix HT maximum
- dimensions_length_cm (number|null)
- dimensions_width_cm (number|null)
- dimensions_height_cm (number|null)
- seat_height_cm (number|null)
- weight_kg (number|null)
- is_outdoor (boolean) : usage extérieur
- is_stackable (boolean) : empilable
- is_chr_heavy_use (boolean) : usage intensif CHR
- uv_resistant (boolean)
- weather_resistant (boolean)
- fire_retardant (boolean)
- lightweight (boolean)
- easy_maintenance (boolean)
- country_of_manufacture (string|null)
- warranty (string|null)
- stock_status (string|null) : "available", "low_stock", "out_of_stock", "on_order", "production"
- stock_quantity (number|null)
- collection (string|null)
- brand_source (string|null)

INSTRUCTIONS CRITIQUES :
- Déduis les champs non présents dans le CSV à partir du contexte (nom, description, matériau)
- Pour category, TOUJOURS choisir parmi la liste fournie. Déduis du nom/description si absent
- Pour les couleurs, normalise TOUJOURS vers les slugs fournis
- Génère style_tags, material_tags, use_case_tags même si pas dans le CSV
- Si une colonne contient des dimensions combinées (ex: "56x58x84"), sépare en L/l/H
- Les prix peuvent être dans n'importe quel format (€, virgule, point) — normalise en nombres
- Retourne UNIQUEMENT un JSON valide, sans markdown ni texte avant/après

Format de réponse :
{
  "column_mapping": {
    "Nom colonne CSV": "champ_db correspondant ou null si non pertinent",
    ...
  },
  "products": [
    { ... objet produit complet avec tous les champs enrichis ... },
    ...
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { headers, rows } = await req.json();

    if (!headers || !rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Provide headers and rows arrays" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Build the CSV preview for Claude (headers + all rows)
    const csvPreview = [
      headers.join(" | "),
      "---",
      ...rows.map((row: string[]) => row.join(" | ")),
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Voici le contenu du fichier CSV d'un fournisseur de mobilier outdoor.\n\nEn-têtes et données :\n${csvPreview}\n\nAnalyse chaque ligne et retourne le JSON avec le mapping de colonnes et les produits enrichis.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic error:", response.status, errText);
      return new Response(JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw: text }), {
        status: 422, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, ...analysis }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("CSV analysis error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
