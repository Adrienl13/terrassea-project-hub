import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    const { description_a, description_b, product_name } = await req.json();

    if (!description_a || !description_b) {
      return new Response(
        JSON.stringify({ error: "description_a and description_b are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are an expert product copywriter for Terrassea, a B2B outdoor furniture sourcing platform for hospitality professionals (hotels, restaurants, beach clubs). Your task is to merge two product descriptions into one cohesive, professional description. The merged description should:
- Combine unique information from both descriptions without redundancy
- Maintain a professional, B2B tone suitable for hospitality buyers
- Highlight key features, materials, dimensions, and benefits
- Be concise yet comprehensive
- Be written in the same language as the input descriptions (French if both are French, English if both are English, etc.)
- Return ONLY the merged description text, no preamble or explanation.`;

    const userMessage = `Please merge these two descriptions for the product "${product_name || "outdoor furniture item"}":

**Description A:**
${description_a}

**Description B:**
${description_b}`;

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
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const merged = data.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ merged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("merge-descriptions error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
