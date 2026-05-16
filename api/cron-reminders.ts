import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret. Fail-closed if env is unset — without the explicit
  // null-check, an unset CRON_SECRET would let the template literal compare
  // against the literal string "Bearer undefined" and accept any caller
  // sending that header.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase config" });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/run-scheduled-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    return res.status(200).json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  // No runtime config needed — cron schedule is in vercel.json
};
