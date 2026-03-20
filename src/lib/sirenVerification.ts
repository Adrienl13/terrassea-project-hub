// ── SIREN Verification via API Recherche Entreprises (gouv.fr) ──────────────
// Free, no API key required. Returns company legal info from SIREN number.
// API docs: https://recherche-entreprises.api.gouv.fr/

export interface SirenResult {
  valid: boolean;
  siren: string;
  companyName: string | null;      // Nom légal (dénomination)
  companyAddress: string | null;    // Adresse du siège
  city: string | null;
  postalCode: string | null;
  legalForm: string | null;         // Forme juridique (SAS, SARL, etc.)
  activityCode: string | null;      // Code NAF/APE
  activityLabel: string | null;     // Libellé activité
  creationDate: string | null;
  isActive: boolean;
  errorMessage: string | null;
}

/**
 * Verify a SIREN number against the French government database.
 * Returns company details if found, or an error if invalid.
 */
export async function verifySiren(siren: string): Promise<SirenResult> {
  // Clean input: remove spaces and dots
  const cleaned = siren.replace(/[\s.]/g, "");

  // Basic format validation
  if (!/^\d{9}$/.test(cleaned) && !/^\d{14}$/.test(cleaned)) {
    return {
      valid: false,
      siren: cleaned,
      companyName: null,
      companyAddress: null,
      city: null,
      postalCode: null,
      legalForm: null,
      activityCode: null,
      activityLabel: null,
      creationDate: null,
      isActive: false,
      errorMessage: "Le SIREN doit contenir 9 chiffres (ou 14 pour un SIRET).",
    };
  }

  // Use first 9 digits (SIREN) even if SIRET provided
  const sirenNumber = cleaned.substring(0, 9);

  try {
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${sirenNumber}&page=1&per_page=1`
    );

    if (!response.ok) {
      return {
        valid: false,
        siren: sirenNumber,
        companyName: null,
        companyAddress: null,
        city: null,
        postalCode: null,
        legalForm: null,
        activityCode: null,
        activityLabel: null,
        creationDate: null,
        isActive: false,
        errorMessage: "Erreur de connexion au service de vérification. Réessayez.",
      };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        valid: false,
        siren: sirenNumber,
        companyName: null,
        companyAddress: null,
        city: null,
        postalCode: null,
        legalForm: null,
        activityCode: null,
        activityLabel: null,
        creationDate: null,
        isActive: false,
        errorMessage: "SIREN introuvable dans la base de données officielle.",
      };
    }

    const company = data.results[0];

    // Verify the SIREN actually matches (API does fuzzy search)
    if (company.siren !== sirenNumber) {
      return {
        valid: false,
        siren: sirenNumber,
        companyName: null,
        companyAddress: null,
        city: null,
        postalCode: null,
        legalForm: null,
        activityCode: null,
        activityLabel: null,
        creationDate: null,
        isActive: false,
        errorMessage: "SIREN introuvable dans la base de données officielle.",
      };
    }

    // Extract siege (headquarters) info
    const siege = company.siege || {};

    return {
      valid: true,
      siren: sirenNumber,
      companyName: company.nom_complet || company.nom_raison_sociale || null,
      companyAddress: siege.adresse || null,
      city: siege.libelle_commune || null,
      postalCode: siege.code_postal || null,
      legalForm: company.nature_juridique
        ? getLegalFormLabel(company.nature_juridique)
        : null,
      activityCode: siege.activite_principale || null,
      activityLabel: siege.libelle_activite_principale || null,
      creationDate: company.date_creation || null,
      isActive: company.etat_administratif === "A",
      errorMessage: company.etat_administratif !== "A"
        ? "Cette entreprise n'est plus active (radiée ou fermée)."
        : null,
    };
  } catch (err) {
    console.error("SIREN verification error:", err);
    return {
      valid: false,
      siren: sirenNumber,
      companyName: null,
      companyAddress: null,
      city: null,
      postalCode: null,
      legalForm: null,
      activityCode: null,
      activityLabel: null,
      creationDate: null,
      isActive: false,
      errorMessage: "Impossible de vérifier le SIREN. Vérifiez votre connexion.",
    };
  }
}

/**
 * Quick check: is a SIREN valid and active?
 */
export async function isSirenValid(siren: string): Promise<boolean> {
  const result = await verifySiren(siren);
  return result.valid && result.isActive;
}

/**
 * Verify that a SIREN matches a given company name (fuzzy match).
 */
export async function verifySirenMatchesCompany(
  siren: string,
  companyName: string
): Promise<{ matches: boolean; officialName: string | null; message: string }> {
  const result = await verifySiren(siren);

  if (!result.valid) {
    return {
      matches: false,
      officialName: null,
      message: result.errorMessage || "SIREN invalide.",
    };
  }

  if (!result.isActive) {
    return {
      matches: false,
      officialName: result.companyName,
      message: "Cette entreprise n'est plus active.",
    };
  }

  // Fuzzy name comparison: normalize and check containment
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const officialNorm = normalize(result.companyName || "");
  const inputNorm = normalize(companyName);

  const matches =
    officialNorm.includes(inputNorm) ||
    inputNorm.includes(officialNorm) ||
    levenshteinSimilarity(officialNorm, inputNorm) > 0.6;

  return {
    matches,
    officialName: result.companyName,
    message: matches
      ? `SIREN vérifié : ${result.companyName}`
      : `Le SIREN correspond à "${result.companyName}", qui ne semble pas correspondre à "${companyName}".`,
  };
}

// ── Levenshtein similarity (0-1) ───────────────────────────────────────────────

function levenshteinSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}

// ── Legal form labels ──────────────────────────────────────────────────────────

function getLegalFormLabel(code: string): string {
  const forms: Record<string, string> = {
    "1000": "Entrepreneur individuel",
    "5410": "SARL",
    "5499": "SARL",
    "5498": "SARL",
    "5505": "SA",
    "5510": "SA",
    "5599": "SA",
    "5710": "SAS",
    "5720": "SASU",
    "5699": "SAS",
    "5800": "Société européenne",
    "6100": "SCI",
    "6599": "SCI",
    "9220": "Association",
    "9300": "Fondation",
  };
  return forms[code] || code;
}
