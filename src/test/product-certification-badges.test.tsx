// Tests for ProductCertificationBadges — ÉTAPE 8f-fix UX.
//
// Validates: empty render, expired filter, max-4 + overflow, color coding,
// scroll-on-click behaviour, name truncation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProductCertificationBadges from "@/components/products/ProductCertificationBadges";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const PARTNER_ID = "22222222-2222-4222-8222-222222222222";

// ── Mocks ───────────────────────────────────────────────────────────────────

let brandCertsFixture: unknown[] = [];
let productCertsFixture: unknown[] = [];
vi.mock("@/lib/referentials", () => ({
  usePartnerCertifications: () => ({ data: brandCertsFixture }),
  useProductCertifications: () => ({ data: productCertsFixture }),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const baseCertification = {
  id: "cert-id",
  slug: "fsc",
  name: "FSC",
  category: "environmental",
  scope: "brand",
  description_i18n: null,
  logo_url: null,
  official_website: null,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function brandEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "pc-1",
    partner_id: PARTNER_ID,
    certification_id: "cert-id",
    certificate_number: "FSC-C123",
    issued_at: null,
    valid_until: "2099-01-01",
    certificate_url: null,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    certification: { ...baseCertification, name: "FSC" },
    ...overrides,
  };
}

function productEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "pcc-1",
    product_id: PRODUCT_ID,
    certification_id: "cert-m1",
    pv_number: "LNE-2025-1234",
    lab_name: "LNE",
    issued_at: null,
    valid_until: "2099-01-01",
    pv_document_url: null,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    certification: {
      ...baseCertification,
      slug: "m1",
      name: "Fire Class M1",
      scope: "product_unit",
    },
    ...overrides,
  };
}

function renderBadges() {
  return render(
    <TooltipProvider>
      <ProductCertificationBadges
        productId={PRODUCT_ID}
        partnerId={PARTNER_ID}
      />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  brandCertsFixture = [];
  productCertsFixture = [];
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ProductCertificationBadges — render conditions (8f-fix UX)", () => {
  it("returns null when no certifications", () => {
    const { container } = renderBadges();
    expect(container.firstChild).toBeNull();
  });

  it("returns null when all certifications are expired", () => {
    brandCertsFixture = [brandEntry({ valid_until: "2020-01-01" })];
    productCertsFixture = [productEntry({ valid_until: "2020-01-01" })];
    const { container } = renderBadges();
    expect(container.firstChild).toBeNull();
  });

  it("filters out expired but keeps valid ones", () => {
    brandCertsFixture = [
      brandEntry({ id: "valid", valid_until: "2099-01-01" }),
      brandEntry({
        id: "expired",
        valid_until: "2020-01-01",
        certification: { ...baseCertification, name: "OldCert" },
      }),
    ];
    renderBadges();
    expect(screen.getByText("FSC")).toBeInTheDocument();
    expect(screen.queryByText("OldCert")).not.toBeInTheDocument();
  });

  it("renders both brand and product certs", () => {
    brandCertsFixture = [brandEntry()];
    productCertsFixture = [productEntry()];
    renderBadges();
    expect(screen.getByText("FSC")).toBeInTheDocument();
    expect(screen.getByText("Fire Class M1")).toBeInTheDocument();
  });
});

describe("ProductCertificationBadges — overflow (8f-fix UX)", () => {
  it("shows max 4 badges and '+N autres' when more", () => {
    brandCertsFixture = [
      brandEntry({ id: "1", certification: { ...baseCertification, name: "C1" } }),
      brandEntry({ id: "2", certification: { ...baseCertification, name: "C2" } }),
      brandEntry({ id: "3", certification: { ...baseCertification, name: "C3" } }),
      brandEntry({ id: "4", certification: { ...baseCertification, name: "C4" } }),
      brandEntry({ id: "5", certification: { ...baseCertification, name: "C5" } }),
      brandEntry({ id: "6", certification: { ...baseCertification, name: "C6" } }),
    ];
    renderBadges();
    expect(screen.getByText("C1")).toBeInTheDocument();
    expect(screen.getByText("C4")).toBeInTheDocument();
    expect(screen.queryByText("C5")).not.toBeInTheDocument();
    expect(screen.getByText("+2 autres")).toBeInTheDocument();
  });

  it("uses singular '+1 autre' when overflow is exactly 1", () => {
    brandCertsFixture = Array.from({ length: 5 }).map((_, i) =>
      brandEntry({
        id: String(i),
        certification: { ...baseCertification, name: `C${i}` },
      }),
    );
    renderBadges();
    expect(screen.getByText("+1 autre")).toBeInTheDocument();
  });

  it("shows total count link 'Voir les X certifications'", () => {
    brandCertsFixture = [brandEntry(), brandEntry({ id: "2" })];
    renderBadges();
    expect(
      screen.getByText(/Voir les 2 certifications/),
    ).toBeInTheDocument();
  });
});

describe("ProductCertificationBadges — interaction (8f-fix UX)", () => {
  it("clicking a badge scrolls to certifications-section", () => {
    const target = document.createElement("section");
    target.id = "certifications-section";
    document.body.appendChild(target);
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy;

    brandCertsFixture = [brandEntry()];
    renderBadges();
    fireEvent.click(screen.getByText("FSC"));
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start" }),
    );
    document.body.removeChild(target);
  });

  it("does not throw when section is missing from DOM", () => {
    brandCertsFixture = [brandEntry()];
    renderBadges();
    expect(() => fireEvent.click(screen.getByText("FSC"))).not.toThrow();
  });
});

describe("ProductCertificationBadges — name truncation (8f-fix UX)", () => {
  it("truncates names longer than threshold with ellipsis", () => {
    brandCertsFixture = [
      brandEntry({
        certification: {
          ...baseCertification,
          name: "Cradle to Cradle Gold Certified",
        },
      }),
    ];
    renderBadges();
    expect(
      screen.getByText((text) => text.includes("…")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Cradle to Cradle Gold Certified"),
    ).not.toBeInTheDocument();
  });

  it("keeps short names intact", () => {
    brandCertsFixture = [brandEntry()];
    renderBadges();
    expect(screen.getByText("FSC")).toBeInTheDocument();
  });
});
