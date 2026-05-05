// Tests for ProductCertificationsPublic — ÉTAPE 8f.
//
// Validates: render conditional on data presence, expired badge logic,
// authenticated vs anon download paths.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductCertificationsPublic from "@/components/products/ProductCertificationsPublic";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const PARTNER_ID = "22222222-2222-4222-8222-222222222222";

// ── Mocks ───────────────────────────────────────────────────────────────────

let userFixture: { id: string } | null = null;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: userFixture, profile: null }),
}));

let brandCertsFixture: unknown[] = [];
let productCertsFixture: unknown[] = [];
vi.mock("@/lib/referentials", () => ({
  usePartnerCertifications: () => ({ data: brandCertsFixture }),
  useProductCertifications: () => ({ data: productCertsFixture }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: "/products/test" }),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        download: () => Promise.resolve({ data: new Blob(["pdf"]), error: null }),
      }),
    },
  },
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

function brandEntry(overrides = {}) {
  return {
    id: "pc-1",
    partner_id: PARTNER_ID,
    certification_id: "cert-id",
    certificate_number: "FSC-C123",
    issued_at: null,
    valid_until: "2030-01-01",
    certificate_url: `${PARTNER_ID}/brand/fsc.pdf`,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    certification: baseCertification,
    ...overrides,
  };
}

function productEntry(overrides = {}) {
  return {
    id: "pcc-1",
    product_id: PRODUCT_ID,
    certification_id: "cert-m1",
    pv_number: "LNE-2025-1234",
    lab_name: "LNE",
    issued_at: null,
    valid_until: "2030-01-01",
    pv_document_url: `${PARTNER_ID}/products/${PRODUCT_ID}/m1.pdf`,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    certification: { ...baseCertification, slug: "m1", name: "Fire Class M1", scope: "product_unit" },
    ...overrides,
  };
}

function renderComponent(partnerName: string | null = "Pros Import") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ProductCertificationsPublic
          productId={PRODUCT_ID}
          partnerId={PARTNER_ID}
          partnerName={partnerName}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  userFixture = null;
  brandCertsFixture = [];
  productCertsFixture = [];
  navigateMock.mockClear();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ProductCertificationsPublic — render conditions (8f)", () => {
  it("returns null when no certifications at all (no rendered section)", () => {
    const { container } = renderComponent();
    expect(container.firstChild).toBeNull();
  });

  it("renders brand-only section when only partner_certifications exist", () => {
    brandCertsFixture = [brandEntry()];
    renderComponent("Pros Import");
    expect(screen.getByText(/Certifications de Pros Import/)).toBeInTheDocument();
    expect(screen.queryByText(/Certifications testées en laboratoire/)).not.toBeInTheDocument();
  });

  it("renders product-only section when only product_certifications exist", () => {
    productCertsFixture = [productEntry()];
    renderComponent();
    expect(screen.getByText(/Certifications testées en laboratoire/)).toBeInTheDocument();
    expect(screen.queryByText(/Certifications de/)).not.toBeInTheDocument();
  });

  it("renders both sections when both present", () => {
    brandCertsFixture = [brandEntry()];
    productCertsFixture = [productEntry()];
    renderComponent("Pros Import");
    expect(screen.getByText(/Certifications de Pros Import/)).toBeInTheDocument();
    expect(screen.getByText(/Certifications testées en laboratoire/)).toBeInTheDocument();
  });

  it("renders fallback title 'Certifications de marque' when partnerName is null", () => {
    brandCertsFixture = [brandEntry()];
    renderComponent(null);
    expect(screen.getByText(/Certifications de marque/)).toBeInTheDocument();
  });
});

describe("ProductCertificationsPublic — auth-gated download (8f)", () => {
  it("shows 'Connexion' button when anon user clicks download", () => {
    brandCertsFixture = [brandEntry()];
    renderComponent();
    expect(screen.getByText("Connexion")).toBeInTheDocument();
  });

  it("anon click on download triggers login redirect", () => {
    brandCertsFixture = [brandEntry()];
    renderComponent();
    fireEvent.click(screen.getByText("Connexion"));
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringContaining("/login?redirect="),
    );
  });

  it("authenticated user sees 'Certificat' button (not Connexion)", () => {
    userFixture = { id: "user-1" };
    brandCertsFixture = [brandEntry()];
    renderComponent();
    expect(screen.getByText("Certificat")).toBeInTheDocument();
    expect(screen.queryByText("Connexion")).not.toBeInTheDocument();
  });

  it("authenticated user on product cert sees 'PV' button", () => {
    userFixture = { id: "user-1" };
    productCertsFixture = [productEntry()];
    renderComponent();
    expect(screen.getByText("PV")).toBeInTheDocument();
  });
});

describe("ProductCertificationsPublic — expired badge (8f)", () => {
  it("displays 'Expiré' badge when valid_until is past", () => {
    brandCertsFixture = [brandEntry({ valid_until: "2020-01-01" })];
    renderComponent();
    expect(screen.getByText("Expiré")).toBeInTheDocument();
  });

  it("does not display 'Expiré' badge when valid_until is future", () => {
    brandCertsFixture = [brandEntry({ valid_until: "2099-01-01" })];
    renderComponent();
    expect(screen.queryByText("Expiré")).not.toBeInTheDocument();
  });

  it("shows global warning when at least one cert is expired", () => {
    brandCertsFixture = [brandEntry({ valid_until: "2020-01-01" })];
    renderComponent();
    expect(
      screen.getByText(/Certaines certifications sont expirées/),
    ).toBeInTheDocument();
  });
});
