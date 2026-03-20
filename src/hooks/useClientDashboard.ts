import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ClientProject {
  id: string;
  name: string;
  venueType: string;
  city: string | null;
  status: string;
  estimatedValue: number;
  budgetRange: string | null;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  quotesCount: number;
  products: ClientProjectProduct[];
}

export interface ClientProjectProduct {
  id: string;
  productId: string;
  name: string;
  category: string;
  image: string | null;
  brand: string | null;
  quantity: number;
  priceMin: number | null;
  material: string | null;
  dimensions: string;
  weight: number | null;
  isOutdoor: boolean;
  isStackable: boolean;
  uvResistant: boolean;
  color: string | null;
  conceptName: string | null;
}

export interface ClientQuote {
  id: string;
  productId: string | null;
  productName: string;
  supplierAlias: string;
  supplierReal: string;
  supplierVerified: boolean;
  supplierCountryCode: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  status: string;
  date: string;
  projectRequestId: string | null;
  projectName: string | null;
  pdfPath: string | null;
  signedAt: string | null;
  // Structured quote fields
  tvaRate: number | null;
  deliveryDelayDays: number | null;
  deliveryConditions: string | null;
  paymentConditions: string | null;
  validityDays: number | null;
  validityExpiresAt: string | null;
  partnerConditions: string | null;
  depositPaidAt: string | null;
}

// ── Fetch projects with products ───────────────────────────────────────────────

async function fetchClientProjects(userEmail: string): Promise<ClientProject[]> {
  // Fetch projects
  const { data: projects, error } = await (supabase
    .from("project_requests" as any)
    .select("*")
    .eq("contact_email", userEmail)
    .order("updated_at", { ascending: false }) as any);

  if (error || !projects) return [];

  // Fetch cart items with product details for all projects
  const projectIds = projects.map((p: any) => p.id);
  const { data: cartItems } = await (supabase
    .from("project_cart_items" as any)
    .select("*, product:product_id(id, name, category, image_url, brand_source, price_min, material_structure, dimensions_length_cm, dimensions_width_cm, dimensions_height_cm, weight_kg, is_outdoor, is_stackable, uv_resistant, main_color)")
    .in("project_request_id", projectIds) as any);

  // Fetch quote counts per project
  const { data: quotes } = await (supabase
    .from("quote_requests" as any)
    .select("id, project_request_id")
    .eq("email", userEmail) as any);

  const quoteCountByProject: Record<string, number> = {};
  (quotes || []).forEach((q: any) => {
    if (q.project_request_id) {
      quoteCountByProject[q.project_request_id] = (quoteCountByProject[q.project_request_id] || 0) + 1;
    }
  });

  // Group cart items by project
  const cartByProject: Record<string, any[]> = {};
  (cartItems || []).forEach((item: any) => {
    const pid = item.project_request_id;
    if (!cartByProject[pid]) cartByProject[pid] = [];
    cartByProject[pid].push(item);
  });

  return projects.map((p: any) => {
    const items = cartByProject[p.id] || [];
    const products: ClientProjectProduct[] = items.map((item: any) => {
      const prod = item.product || {};
      const dims = [
        prod.dimensions_length_cm ? `${prod.dimensions_length_cm}` : null,
        prod.dimensions_width_cm ? `${prod.dimensions_width_cm}` : null,
        prod.dimensions_height_cm ? `${prod.dimensions_height_cm}` : null,
      ].filter(Boolean).join("×");

      return {
        id: item.id,
        productId: item.product_id,
        name: prod.name || "—",
        category: prod.category || "—",
        image: prod.image_url || null,
        brand: prod.brand_source || null,
        quantity: item.quantity,
        priceMin: prod.price_min ? Number(prod.price_min) : null,
        material: prod.material_structure || null,
        dimensions: dims ? `${dims} cm` : "—",
        weight: prod.weight_kg ? Number(prod.weight_kg) : null,
        isOutdoor: prod.is_outdoor ?? true,
        isStackable: prod.is_stackable ?? false,
        uvResistant: prod.uv_resistant ?? false,
        color: prod.main_color || null,
        conceptName: item.concept_name || null,
      };
    });

    return {
      id: p.id,
      name: p.project_name || "Sans nom",
      venueType: p.venue_type || "other",
      city: p.city || null,
      status: p.status || "draft",
      estimatedValue: Number(p.estimated_value) || 0,
      budgetRange: p.budget_range || null,
      createdAt: p.created_at,
      updatedAt: p.updated_at || p.created_at,
      productCount: products.length,
      quotesCount: quoteCountByProject[p.id] || 0,
      products,
    };
  });
}

// ── Fetch quotes ───────────────────────────────────────────────────────────────

async function fetchClientQuotes(userEmail: string): Promise<ClientQuote[]> {
  const { data: quotes, error } = await (supabase
    .from("quote_requests" as any)
    .select("*, project:project_request_id(project_name), order:orders!quote_request_id(deposit_paid_at)")
    .eq("email", userEmail)
    .order("created_at", { ascending: false }) as any);

  if (error || !quotes) return [];

  return quotes.map((q: any, i: number) => ({
    id: q.id,
    productId: q.product_id,
    productName: q.product_name || "—",
    supplierAlias: q.partner_name || `Partenaire ${String.fromCharCode(65 + i)}`,
    supplierReal: q.partner_name || "—",
    supplierVerified: true,
    supplierCountryCode: q.supplier_country_code || null,
    tvaRate: q.tva_rate ?? null,
    deliveryDelayDays: q.delivery_delay_days ?? null,
    deliveryConditions: q.delivery_conditions ?? null,
    paymentConditions: q.payment_conditions ?? null,
    validityDays: q.validity_days ?? null,
    validityExpiresAt: q.validity_expires_at ?? null,
    partnerConditions: q.partner_conditions ?? null,
    depositPaidAt: q.order?.[0]?.deposit_paid_at ?? null,
    quantity: q.quantity || 0,
    unitPrice: q.unit_price ? Number(q.unit_price) : null,
    totalPrice: q.total_price ? Number(q.total_price) : null,
    status: q.status || "pending",
    date: new Date(q.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
    projectRequestId: q.project_request_id,
    projectName: q.project?.project_name || null,
    pdfPath: q.latest_pdf_path || null,
    signedAt: q.signed_at || null,
  }));
}

// ── React hooks ────────────────────────────────────────────────────────────────

export function useClientProjects() {
  const { profile } = useAuth();
  const email = profile?.email;

  return useQuery({
    queryKey: ["client-projects", email],
    queryFn: () => fetchClientProjects(email!),
    enabled: !!email,
  });
}

export function useClientQuotes() {
  const { profile } = useAuth();
  const email = profile?.email;

  return useQuery({
    queryKey: ["client-quotes", email],
    queryFn: () => fetchClientQuotes(email!),
    enabled: !!email,
  });
}

// ── Stats helper ───────────────────────────────────────────────────────────────

export function useClientStats() {
  const { data: projects = [] } = useClientProjects();
  const { data: quotes = [] } = useClientQuotes();

  const activeProjects = projects.filter((p) => !["draft", "completed", "cancelled", "delivered"].includes(p.status)).length;
  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
  const totalEstimated = projects.reduce((sum, p) => sum + p.estimatedValue, 0);
  const totalProducts = projects.reduce((sum, p) => sum + p.productCount, 0);

  const projectsByStatus: Record<string, number> = {};
  projects.forEach((p) => {
    projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
  });

  return { activeProjects, pendingQuotes, totalEstimated, totalProducts, projectsByStatus, projects, quotes };
}
