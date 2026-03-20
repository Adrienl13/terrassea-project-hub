// ── Pro Service Hub — shared mock data ────────────────────────────────────────

export type ProjectStatus =
  | "submitted"
  | "in_review"
  | "matched"
  | "connected"
  | "completed"
  | "declined";

export type ConnectionStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed";

export type ProfessionalType = "supplier" | "architect";

export interface ProProject {
  id: string;
  title: string;
  clientType: string;
  city: string;
  country: string;
  budget: string;
  budgetNum: number;
  covers: number;
  area: string;
  needs: string[];
  style: string;
  timeline: string;
  status: ProjectStatus;
  matchedCount: number;
  createdAt: string;
  clientName?: string;
  clientCompany?: string;
}

export type ProVisibility = "anonymous" | "standard" | "featured";

export interface ProProfessional {
  id: string;
  name: string;
  company: string;
  type: ProfessionalType;
  specialties: string[];
  location: string;
  country?: string;
  countryCode?: string;
  rating: number;
  projectsCompleted: number;
  avatar?: string;
  plan?: "starter" | "growth" | "elite";
  visibility?: ProVisibility;
  reviewHighlights?: string[];
}

// ── Visibility helpers ────────────────────────────────────────────────────────

export function getProVisibility(pro: ProProfessional): ProVisibility {
  if (pro.visibility) return pro.visibility;
  if (pro.plan === "elite") return "featured";
  if (pro.plan === "growth") return "standard";
  return "anonymous";
}

export function getProDisplayName(pro: ProProfessional): string {
  const vis = getProVisibility(pro);
  if (vis === "featured") return pro.name;
  if (vis === "standard") {
    const parts = pro.name.split(" ");
    return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  }
  const typeLabel = pro.type === "supplier" ? "Fournisseur" : "Architecte";
  return `${typeLabel} vérifié #${pro.id.replace(/\D/g, "").slice(-2) || "00"}`;
}

export function getProDisplayCompany(pro: ProProfessional): string | null {
  return getProVisibility(pro) === "featured" ? pro.company : null;
}

export function getProDisplayLocation(pro: ProProfessional): string {
  const vis = getProVisibility(pro);
  if (vis === "featured" || vis === "standard") return pro.location;
  return pro.country || pro.location.split(",").pop()?.trim() || "Europe";
}

export function getProFlag(pro: ProProfessional): string {
  if (!pro.countryCode || pro.countryCode.length !== 2) return "";
  return String.fromCodePoint(
    ...pro.countryCode.toUpperCase().split("").map((c: string) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export interface ProConnection {
  id: string;
  projectId: string;
  professionalId: string;
  status: ConnectionStatus;
  connectedAt: string;
  message?: string;
}

// ── Mock Projects ─────────────────────────────────────────────────────────────

export const MOCK_PROJECTS: ProProject[] = [
  {
    id: "proj-001",
    title: "Grand Hôtel Côte d'Azur — Terrasse 400m²",
    clientType: "hotel",
    city: "Nice",
    country: "France",
    budget: "€120,000",
    budgetNum: 120000,
    covers: 280,
    area: "400m²",
    needs: ["mobilier", "éclairage", "végétalisation"],
    style: "Mediterranean luxury",
    timeline: "Mai 2026",
    status: "matched",
    matchedCount: 4,
    createdAt: "2026-02-15",
    clientName: "Pierre Dumont",
    clientCompany: "Grand Hôtel Riviera",
  },
  {
    id: "proj-002",
    title: "Restaurant gastronomique — Patio & Rooftop",
    clientType: "restaurant",
    city: "Lyon",
    country: "France",
    budget: "€65,000",
    budgetNum: 65000,
    covers: 150,
    area: "180m²",
    needs: ["mobilier", "parasols", "chauffage"],
    style: "Industrial chic",
    timeline: "Juin 2026",
    status: "in_review",
    matchedCount: 0,
    createdAt: "2026-03-01",
    clientName: "Marie Lefèvre",
    clientCompany: "La Table du Chef",
  },
  {
    id: "proj-003",
    title: "Beach Club Ibiza — Full aménagement plage",
    clientType: "beach_club",
    city: "Ibiza",
    country: "Spain",
    budget: "€200,000",
    budgetNum: 200000,
    covers: 400,
    area: "800m²",
    needs: ["sunbeds", "cabanas", "bar furniture", "parasols"],
    style: "Bohemian coastal",
    timeline: "Avril 2026",
    status: "connected",
    matchedCount: 6,
    createdAt: "2026-01-20",
    clientName: "Carlos Martinez",
    clientCompany: "Azure Beach Group",
  },
  {
    id: "proj-004",
    title: "Camping Premium — Glamping outdoor",
    clientType: "camping",
    city: "Gordes",
    country: "France",
    budget: "€45,000",
    budgetNum: 45000,
    covers: 120,
    area: "300m²",
    needs: ["mobilier extérieur", "éclairage solaire", "hamacs"],
    style: "Natural & rustic",
    timeline: "Mars 2026",
    status: "completed",
    matchedCount: 3,
    createdAt: "2025-11-10",
    clientName: "Sophie Bernard",
    clientCompany: "Domaine des Oliviers",
  },
  {
    id: "proj-005",
    title: "Rooftop Bar — 150 places",
    clientType: "rooftop",
    city: "Paris",
    country: "France",
    budget: "€85,000",
    budgetNum: 85000,
    covers: 150,
    area: "250m²",
    needs: ["mobilier", "éclairage", "végétalisation", "bar setup"],
    style: "Contemporary minimalist",
    timeline: "Juillet 2026",
    status: "submitted",
    matchedCount: 0,
    createdAt: "2026-03-10",
    clientName: "Antoine Moreau",
    clientCompany: "Skyline Hospitality",
  },
  {
    id: "proj-006",
    title: "Boutique Hotel — Poolside & Garden",
    clientType: "hotel",
    city: "Porto",
    country: "Portugal",
    budget: "€95,000",
    budgetNum: 95000,
    covers: 200,
    area: "350m²",
    needs: ["pool furniture", "garden sets", "umbrellas"],
    style: "Portuguese contemporary",
    timeline: "Mai 2026",
    status: "matched",
    matchedCount: 3,
    createdAt: "2026-02-28",
    clientName: "Ana Ribeiro",
    clientCompany: "Casa do Rio Hotel",
  },
  {
    id: "proj-007",
    title: "Chaîne de restaurants — 5 terrasses standardisées",
    clientType: "restaurant",
    city: "Marseille",
    country: "France",
    budget: "€180,000",
    budgetNum: 180000,
    covers: 500,
    area: "5 × 100m²",
    needs: ["mobilier identique", "branding", "parasols personnalisés"],
    style: "Brand-consistent modern",
    timeline: "Septembre 2026",
    status: "in_review",
    matchedCount: 0,
    createdAt: "2026-03-05",
    clientName: "François Petit",
    clientCompany: "Groupe Méditerranée",
  },
  {
    id: "proj-008",
    title: "Spa & Wellness — Espace détente extérieur",
    clientType: "hotel",
    city: "Aix-en-Provence",
    country: "France",
    budget: "€55,000",
    budgetNum: 55000,
    covers: 80,
    area: "200m²",
    needs: ["daybed loungers", "shade structures", "zen garden furniture"],
    style: "Zen minimalist",
    timeline: "Août 2026",
    status: "submitted",
    matchedCount: 0,
    createdAt: "2026-03-15",
    clientName: "Claire Fontaine",
    clientCompany: "Thermes de Provence",
  },
];

// ── Mock Professionals ────────────────────────────────────────────────────────

export const MOCK_PROFESSIONALS: ProProfessional[] = [
  {
    id: "pro-001",
    name: "Marco Bianchi",
    company: "Outdoor Living Italia",
    type: "supplier",
    specialties: ["teak furniture", "marine-grade", "custom"],
    location: "Milan, Italy",
    country: "Italy",
    countryCode: "IT",
    rating: 4.8,
    projectsCompleted: 45,
    plan: "elite",
    reviewHighlights: ["Qualité exceptionnelle du teck", "Livraison ponctuelle pour 40 tables", "Service après-vente réactif"],
  },
  {
    id: "pro-002",
    name: "Élise Garnier",
    company: "Atelier Garnier",
    type: "architect",
    specialties: ["hospitality design", "rooftops", "terraces"],
    location: "Paris, France",
    country: "France",
    countryCode: "FR",
    rating: 4.9,
    projectsCompleted: 32,
    plan: "elite",
    reviewHighlights: ["Design raffiné et fonctionnel", "Excellente gestion du projet", "Très à l'écoute des besoins client"],
  },
  {
    id: "pro-003",
    name: "Jan de Vries",
    company: "NordOutdoor",
    type: "supplier",
    specialties: ["aluminium", "parasols", "shade structures"],
    location: "Amsterdam, Netherlands",
    country: "Netherlands",
    countryCode: "NL",
    rating: 4.7,
    projectsCompleted: 58,
    plan: "growth",
    reviewHighlights: ["Parasols résistants au vent", "Bon rapport qualité-prix"],
  },
  {
    id: "pro-004",
    name: "Sofia Castellano",
    company: "Studio Castellano",
    type: "architect",
    specialties: ["beach clubs", "resorts", "landscape"],
    location: "Barcelona, Spain",
    country: "Spain",
    countryCode: "ES",
    rating: 4.9,
    projectsCompleted: 27,
    plan: "growth",
    reviewHighlights: ["Ambiance beach club parfaite", "Créative et pragmatique"],
  },
  {
    id: "pro-005",
    name: "Thomas Laurent",
    company: "Mobilier Pro France",
    type: "supplier",
    specialties: ["contract furniture", "stackable", "high-volume"],
    location: "Lyon, France",
    country: "France",
    countryCode: "FR",
    rating: 4.6,
    projectsCompleted: 72,
    plan: "starter",
    reviewHighlights: ["Gros volumes bien gérés", "Chaises empilables solides"],
  },
  {
    id: "pro-006",
    name: "Elena Vasquez",
    company: "Iberia Outdoor Solutions",
    type: "supplier",
    specialties: ["rattan", "woven", "coastal styles"],
    location: "Valencia, Spain",
    country: "Spain",
    countryCode: "ES",
    rating: 4.7,
    projectsCompleted: 38,
    plan: "starter",
    reviewHighlights: ["Style côtier authentique", "Mobilier résistant aux intempéries"],
  },
];

// ── Mock Connections ──────────────────────────────────────────────────────────

export const MOCK_CONNECTIONS: ProConnection[] = [
  {
    id: "conn-001",
    projectId: "proj-001",
    professionalId: "pro-001",
    status: "accepted",
    connectedAt: "2026-02-20",
    message: "Interested in supplying teak terrace sets for this project.",
  },
  {
    id: "conn-002",
    projectId: "proj-001",
    professionalId: "pro-003",
    status: "accepted",
    connectedAt: "2026-02-22",
    message: "We can provide the shade solutions.",
  },
  {
    id: "conn-003",
    projectId: "proj-003",
    professionalId: "pro-006",
    status: "accepted",
    connectedAt: "2026-02-01",
    message: "Full beach furniture range available.",
  },
  {
    id: "conn-004",
    projectId: "proj-003",
    professionalId: "pro-004",
    status: "pending",
    connectedAt: "2026-03-12",
    message: "Would love to design the layout.",
  },
  {
    id: "conn-005",
    projectId: "proj-006",
    professionalId: "pro-005",
    status: "pending",
    connectedAt: "2026-03-08",
  },
  // Architect (pro-002) connections
  {
    id: "conn-006",
    projectId: "proj-001",
    professionalId: "pro-002",
    status: "accepted",
    connectedAt: "2026-02-18",
    message: "Expérience en terrasses hôtelières de luxe. Portfolio disponible sur demande.",
  },
  {
    id: "conn-007",
    projectId: "proj-006",
    professionalId: "pro-002",
    status: "accepted",
    connectedAt: "2026-03-02",
    message: "Design contemporain portugais — c'est exactement ma spécialité.",
  },
  {
    id: "conn-008",
    projectId: "proj-003",
    professionalId: "pro-002",
    status: "pending",
    connectedAt: "2026-03-12",
    message: "Mon studio a une expertise reconnue dans l'aménagement de beach clubs.",
  },
  {
    id: "conn-009",
    projectId: "proj-004",
    professionalId: "pro-002",
    status: "completed",
    connectedAt: "2025-11-15",
    message: "Projet livré avec succès.",
  },
];

// ── Mock Supplier Calls (architect-specific) ──────────────────────────────────

export type CallStatus = "open" | "closed" | "selecting";

export interface SupplierCallResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  message: string;
  estimatedAmount: number;
  deliveryWeeks: number;
  warranty: string;
  date: string;
  selected?: boolean;
}

export interface SupplierCall {
  id: string;
  projectId: string;
  title: string;
  description: string;
  categories: string[];
  status: CallStatus;
  createdAt: string;
  deadline: string;
  responseCount: number;
  responses: SupplierCallResponse[];
}

export const MOCK_SUPPLIER_CALLS: SupplierCall[] = [
  {
    id: "call-001",
    projectId: "proj-001",
    title: "Mobilier teck terrasse principale",
    description: "Recherche fournisseur pour tables et chaises en teck grade A, finition huilée. 40 tables + 160 chaises. Résistance marine requise.",
    categories: ["teak furniture", "marine-grade"],
    status: "selecting",
    createdAt: "2026-02-18",
    deadline: "2026-03-15",
    responseCount: 4,
    responses: [
      {
        id: "resp-001", supplierId: "pro-001", supplierName: "Marco Bianchi", supplierCompany: "Outdoor Living Italia",
        message: "Nous proposons notre gamme Riviera en teck grade A certifié FSC. Finition huile Osmo marine. Livraison sous 6 semaines.",
        estimatedAmount: 52000, deliveryWeeks: 6, warranty: "5 ans", date: "2026-02-22", selected: true,
      },
      {
        id: "resp-002", supplierId: "pro-005", supplierName: "Thomas Laurent", supplierCompany: "Mobilier Pro France",
        message: "Gamme Provence disponible en teck recyclé. Prix très compétitif. Livraison depuis notre entrepôt Lyon.",
        estimatedAmount: 38000, deliveryWeeks: 4, warranty: "3 ans", date: "2026-02-25",
      },
      {
        id: "resp-003", supplierId: "pro-006", supplierName: "Elena Vasquez", supplierCompany: "Iberia Outdoor Solutions",
        message: "Notre collection Mediterráneo combine teck et corde tressée. Très populaire dans les hôtels 5 étoiles.",
        estimatedAmount: 61000, deliveryWeeks: 8, warranty: "5 ans", date: "2026-02-28",
      },
      {
        id: "resp-004", supplierId: "pro-003", supplierName: "Jan de Vries", supplierCompany: "NordOutdoor",
        message: "Nous pouvons fournir les tables en teck et les chaises en aluminium/teck pour un meilleur rapport qualité-prix.",
        estimatedAmount: 44500, deliveryWeeks: 5, warranty: "4 ans", date: "2026-03-01",
      },
    ],
  },
  {
    id: "call-002",
    projectId: "proj-001",
    title: "Éclairage architectural extérieur",
    description: "Éclairage LED encastré pour allées + suspensions pour espace dining. IP65 minimum. Dimmable requis.",
    categories: ["lighting", "outdoor"],
    status: "open",
    createdAt: "2026-03-01",
    deadline: "2026-03-25",
    responseCount: 2,
    responses: [
      {
        id: "resp-005", supplierId: "pro-003", supplierName: "Jan de Vries", supplierCompany: "NordOutdoor",
        message: "Notre partenaire Flos Outdoor propose des solutions complètes IP65 dimmable. Catalogue joint.",
        estimatedAmount: 18000, deliveryWeeks: 4, warranty: "3 ans", date: "2026-03-05",
      },
      {
        id: "resp-006", supplierId: "pro-005", supplierName: "Thomas Laurent", supplierCompany: "Mobilier Pro France",
        message: "Nous distribuons la gamme Vibia outdoor. Estimation préliminaire ci-dessous.",
        estimatedAmount: 22000, deliveryWeeks: 5, warranty: "2 ans", date: "2026-03-08",
      },
    ],
  },
  {
    id: "call-003",
    projectId: "proj-006",
    title: "Mobilier poolside & parasols",
    description: "Bains de soleil, tables d'appoint et parasols pour zone piscine. Résistance chlore et UV. Style contemporain portugais.",
    categories: ["pool furniture", "parasols"],
    status: "open",
    createdAt: "2026-03-05",
    deadline: "2026-04-01",
    responseCount: 1,
    responses: [
      {
        id: "resp-007", supplierId: "pro-006", supplierName: "Elena Vasquez", supplierCompany: "Iberia Outdoor Solutions",
        message: "Nous avons la gamme Porto parfaite pour ce type de projet. Référence dans plusieurs boutique hotels au Portugal.",
        estimatedAmount: 35000, deliveryWeeks: 6, warranty: "4 ans", date: "2026-03-10",
      },
    ],
  },
];

// ── Mock Application Messages ─────────────────────────────────────────────────

export interface ApplicationMessage {
  projectId: string;
  professionalId: string;
  message: string;
  sentAt: string;
}

export const MOCK_APPLICATION_MESSAGES: ApplicationMessage[] = [
  {
    projectId: "proj-003",
    professionalId: "pro-002",
    message: "Mon studio a une expertise reconnue dans l'aménagement de beach clubs. Nous avons livré 5 projets similaires en Méditerranée. Je serais ravie de vous présenter notre approche.",
    sentAt: "2026-03-12",
  },
];

// ── Mock Portfolio Extras ─────────────────────────────────────────────────────

export interface PortfolioExtra {
  projectId: string;
  finalBudget: string;
  deliveredDate: string;
  clientTestimonial?: string;
  clientRating?: number;
  suppliersUsed: string[];
  highlights: string[];
}

export const MOCK_PORTFOLIO_EXTRAS: PortfolioExtra[] = [
  {
    projectId: "proj-004",
    finalBudget: "€42,800",
    deliveredDate: "Février 2026",
    clientTestimonial: "Élise a parfaitement compris notre vision naturelle et a sourcé des fournisseurs que nous n'aurions jamais trouvés seuls. Les hamacs Barlovento sont le coup de coeur de nos clients.",
    clientRating: 5,
    suppliersUsed: ["Mobilier Pro France", "Barlovento Design", "Jardiland Pro"],
    highlights: [
      "Livraison en 2 phases pour ne pas perturber l'activité",
      "10% sous le budget initial grâce au sourcing multi-fournisseurs",
      "Mobilier solaire autonome — zéro câblage",
    ],
  },
];

// ── Architect Requests (client → architect) ───────────────────────────────────

export type ArchitectRequestStatus = "searching" | "proposed" | "accepted" | "in_progress" | "completed";

export interface ArchitectRequest {
  id: string;
  projectId?: string;
  clientName: string;
  clientCompany: string;
  establishmentType: string;
  city: string;
  country: string;
  spaces: string;
  area: string;
  covers: number;
  budget: string;
  style: string;
  timeline: string;
  description: string;
  architectNeeds: string[];
  status: ArchitectRequestStatus;
  createdAt: string;
  matchedArchitectId?: string;
}

export const ARCHITECT_REQUEST_STATUS_CONFIG: Record<ArchitectRequestStatus, { label: string; style: string }> = {
  searching:   { label: "Searching",    style: "bg-blue-50 text-blue-700" },
  proposed:    { label: "Proposed",     style: "bg-amber-50 text-amber-700" },
  accepted:    { label: "Accepted",     style: "bg-green-50 text-green-700" },
  in_progress: { label: "In progress",  style: "bg-purple-50 text-purple-700" },
  completed:   { label: "Completed",    style: "bg-muted text-muted-foreground" },
};

export const MOCK_ARCHITECT_REQUESTS: ArchitectRequest[] = [
  {
    id: "areq-001",
    projectId: "proj-001",
    clientName: "Pierre Dumont",
    clientCompany: "Grand Hôtel Riviera",
    establishmentType: "hotel",
    city: "Nice",
    country: "France",
    spaces: "Terrasse principale, pool deck, jardin",
    area: "400m²",
    covers: 280,
    budget: "€120,000",
    style: "Mediterranean luxury",
    timeline: "Mai 2026",
    description: "Nous rénovons l'intégralité de nos espaces extérieurs. Nous cherchons un architecte d'intérieur spécialisé en hospitality pour concevoir l'aménagement des 3 zones et coordonner le sourcing mobilier avec les fournisseurs.",
    architectNeeds: ["space planning", "mood boards", "supplier coordination", "on-site follow-up"],
    status: "accepted",
    createdAt: "2026-02-10",
    matchedArchitectId: "pro-002",
  },
  {
    id: "areq-002",
    projectId: "proj-005",
    clientName: "Antoine Moreau",
    clientCompany: "Skyline Hospitality",
    establishmentType: "rooftop",
    city: "Paris",
    country: "France",
    spaces: "Rooftop bar, lounge, terrasse dining",
    area: "250m²",
    covers: 150,
    budget: "€85,000",
    style: "Contemporary minimalist",
    timeline: "Juillet 2026",
    description: "Ouverture d'un nouveau rooftop bar. Nous avons besoin d'un architecte pour optimiser l'espace en 3 zones (bar, lounge, dining) et sélectionner du mobilier résistant au vent. Nous n'avons aucune expérience en aménagement outdoor.",
    architectNeeds: ["full design", "wind-resistant solutions", "lighting design", "supplier selection"],
    status: "searching",
    createdAt: "2026-03-10",
  },
  {
    id: "areq-003",
    clientName: "Sophie Martin",
    clientCompany: "Le Petit Jardin",
    establishmentType: "restaurant",
    city: "Bordeaux",
    country: "France",
    spaces: "Jardin arrière, terrasse couverte",
    area: "120m²",
    covers: 80,
    budget: "€35,000",
    style: "Bohemian garden",
    timeline: "Juin 2026",
    description: "Restaurant bistronomique avec un jardin caché. On veut créer une ambiance bohème chic mais on ne sait pas par où commencer. Besoin de quelqu'un pour nous guider sur le style, choisir les matériaux et nous aider à trouver les bons fournisseurs.",
    architectNeeds: ["style direction", "material selection", "mood boards"],
    status: "proposed",
    createdAt: "2026-03-15",
    matchedArchitectId: "pro-002",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; style: string }> = {
  submitted:  { label: "Submitted",  style: "bg-blue-50 text-blue-700" },
  in_review:  { label: "In Review",  style: "bg-amber-50 text-amber-700" },
  matched:    { label: "Matched",    style: "bg-purple-50 text-purple-700" },
  connected:  { label: "Connected",  style: "bg-green-50 text-green-700" },
  completed:  { label: "Completed",  style: "bg-muted text-muted-foreground" },
  declined:   { label: "Declined",   style: "bg-red-50 text-red-700" },
};

export const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, { label: string; style: string }> = {
  pending:   { label: "Pending",   style: "bg-amber-50 text-amber-700" },
  accepted:  { label: "Accepted",  style: "bg-green-50 text-green-700" },
  declined:  { label: "Declined",  style: "bg-red-50 text-red-700" },
  completed: { label: "Completed", style: "bg-muted text-muted-foreground" },
};

export function getProjectById(id: string): ProProject | undefined {
  return MOCK_PROJECTS.find(p => p.id === id);
}

export function getProfessionalById(id: string): ProProfessional | undefined {
  return MOCK_PROFESSIONALS.find(p => p.id === id);
}

export function getConnectionsForProject(projectId: string): (ProConnection & { professional: ProProfessional })[] {
  return MOCK_CONNECTIONS
    .filter(c => c.projectId === projectId)
    .map(c => ({ ...c, professional: getProfessionalById(c.professionalId)! }))
    .filter(c => c.professional);
}

export function getConnectionsForProfessional(professionalId: string): (ProConnection & { project: ProProject })[] {
  return MOCK_CONNECTIONS
    .filter(c => c.professionalId === professionalId)
    .map(c => ({ ...c, project: getProjectById(c.projectId)! }))
    .filter(c => c.project);
}

/** Compute a match score (0-100) between a project and a professional */
export function computeMatchScore(project: ProProject, pro: ProProfessional): number {
  let score = 50; // base
  // Location proximity bonus
  if (project.country === "France" && pro.location.includes("France")) score += 15;
  if (project.country === "Spain" && pro.location.includes("Spain")) score += 15;
  // Specialty overlap
  const overlap = pro.specialties.filter(s =>
    project.needs.some(n => n.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(n.toLowerCase()))
  );
  score += overlap.length * 10;
  // Experience bonus
  if (pro.projectsCompleted > 40) score += 10;
  if (pro.rating >= 4.8) score += 5;
  return Math.min(score, 98);
}
