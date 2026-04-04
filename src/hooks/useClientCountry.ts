import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { langToCountry } from "@/lib/countries";

/**
 * Resolves the client's country code (ISO 2-letter) using a 3-level cascade:
 *   1. User profile (if logged in and country_code is set)
 *   2. Vercel geo header via /api/geo
 *   3. navigator.language fallback
 */
export function useClientCountry() {
  const { profile } = useAuth();
  const [geoCountry, setGeoCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Level 1: profile
  const profileCountry = profile?.country_code ?? null;

  // Level 2: /api/geo (only if no profile country)
  useEffect(() => {
    if (profileCountry) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.country_code) setGeoCountry(data.country_code);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileCountry]);

  // Level 3: navigator.language
  const langCountry = typeof navigator !== "undefined"
    ? langToCountry(navigator.language)
    : null;

  const countryCode = profileCountry || geoCountry || langCountry || "FR";
  const source = profileCountry ? "profile" : geoCountry ? "geo" : langCountry ? "lang" : "default";

  return { countryCode, source, loading };
}
