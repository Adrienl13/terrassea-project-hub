// Tests for PartnerCertifications + form schema — ÉTAPE 8e-1.
//
// Schema validation tests on partnerCertificationSchema (8d-5) — extended
// scope here because the form actively uses these checks. No render of the
// Sheet form (heavy + fragile, per 8b/8c pattern).

import { describe, it, expect } from "vitest";
import { partnerCertificationSchema } from "@/lib/referentials/partnerCertificationSchema";

const VALID_PARTNER = "11111111-1111-4111-8111-111111111111";
const VALID_CERT = "22222222-2222-4222-8222-222222222222";

describe("partnerCertificationSchema — form-level validation (8e-1)", () => {
  it("validates happy path with all fields populated", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      certificate_number: "FSC-C123456",
      issued_at: "2024-01-15",
      valid_until: "2027-01-15",
      certificate_url: `${VALID_PARTNER}/fsc_1714912345.pdf`,
      notes: "Audit annuel à prévoir",
    });
    // certificate_url here is a storage path, NOT a URL — the schema rejects
    // it because of the .url() check. Document this expectation: Phase 8e-1
    // form bypasses certificate_url validation by passing the value as
    // existingPdfPath and using empty string for the schema check.
    expect(result.success).toBe(false);
  });

  it("validates happy path with empty certificate_url (form-level OK)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      certificate_number: "FSC-C123456",
      issued_at: "2024-01-15",
      valid_until: "2027-01-15",
      certificate_url: "",
      notes: "Test",
    });
    expect(result.success).toBe(true);
  });

  it("validates minimal payload (only required uuids)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing partner_id", () => {
    const result = partnerCertificationSchema.safeParse({
      certification_id: VALID_CERT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing certification_id", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
    });
    expect(result.success).toBe(false);
  });

  it("rejects partner_id non-uuid", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: "not-a-uuid",
      certification_id: VALID_CERT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects issued_at non-ISO format", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      issued_at: "15-01-2024",
    });
    expect(result.success).toBe(false);
  });

  it("rejects valid_until non-ISO format", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      valid_until: "2024",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null dates (no expiration)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      issued_at: null,
      valid_until: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed certificate_url (no protocol, not empty)", () => {
    const result = partnerCertificationSchema.safeParse({
      partner_id: VALID_PARTNER,
      certification_id: VALID_CERT,
      certificate_url: "fsc.org/cert.pdf",
    });
    expect(result.success).toBe(false);
  });
});
