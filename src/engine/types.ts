export interface ProjectParameters {
  establishmentType: string;
  projectZone: string;
  seatingCapacity: number | null;
  seatingLayout: string; // "mostly-2" | "balanced-2-4" | "mostly-4" | "modular" | "group" | "custom"
  layoutPriority: string; // "max-capacity" | "balanced" | "spacious" | "flexible-groups" | "couples" | "groups"
  style: string[];
  ambience: string[];
  colorPalette: string[];
  materialPreferences: string[];
  technicalConstraints: string[];
  isOutdoor: boolean;
  budgetLevel: string;
  timeline: string;
}

export interface ProjectConcept {
  id: string;
  title: string;
  description: string;
  colorPalette: string[]; // hex colors
  colorNames: string[];
  moodKeywords: string[];
  products: RecommendedProduct[];
  layout?: LayoutRecommendation;
}

export interface LayoutRecommendation {
  label: string; // "Suggested layout" | "Alternative layout" | "Flexible layout"
  totalSeats: number;
  tableGroups: TableGroup[];
  chairCount: number;
  notes: string;
}

export interface TableGroup {
  tableFormat: string; // e.g. "70×70", "120×70", "120×80"
  shape: string;
  quantity: number;
  seatsPerTable: number;
  totalSeats: number;
}

export interface RecommendedProduct {
  productId: string;
  relevanceScore: number;
  reason: string;
  suggestedQuantity?: number;
}

export interface DiscoveryQuestion {
  id: string;
  question: string;
  options: string[];
  field: keyof ProjectParameters | 'raw';
  priority: number; // higher = more important to ask
}

export interface ProjectSummary {
  establishment: string;
  zone: string;
  style: string;
  ambience: string;
  capacity: string;
  layout: string;
  layoutPriority: string;
  palette: string;
  materials: string;
  constraints: string;
}

export interface EnrichedProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  style: string;
  material: string;
  tags: ProductTags;
  scoring: ProductScoring;
}

export interface ProductTags {
  style: string[];
  ambience: string[];
  color: string[];
  useCase: string[];
  technical: string[];
}

export interface ProductScoring {
  popularity: number;
  complementarity: Record<string, number>;
  diversityGroup: string;
}
