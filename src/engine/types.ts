export interface ProjectParameters {
  builderMode: "guided" | "expert" | "";
  establishmentType: string;
  projectZone: string;
  seatingCapacity: number | null;
  seatingLayout: string;
  layoutPriority: string;
  style: string[];
  ambience: string[];
  colorPalette: string[];
  materialPreferences: string[];
  technicalConstraints: string[];
  isOutdoor: boolean;
  budgetLevel: string;
  timeline: string;
  terraceSurfaceM2: number | null;
  terraceLength: number | null;
  terraceWidth: number | null;
  tableMix?: TableMixEntry[];
}

export interface TableMixEntry {
  format: string;
  quantity: number;
  seatsPerTable: number;
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

export type LayoutRequirementType =
  | "chair"
  | "armchair"
  | "complete_table"
  | "table_base"
  | "tabletop"
  | "parasol"
  | "other";

export interface LayoutRequirement {
  id: string;
  type: LayoutRequirementType;
  label: string;
  requiredQuantity: number;
  tableFormat?: string;
}

export interface LayoutRecommendation {
  label: string; // "Suggested layout" | "Alternative layout" | "Flexible layout"
  totalSeats: number;
  tableGroups: TableGroup[];
  chairCount: number;
  notes: string;
  spatialMetrics?: SpatialMetricsData;
  requirements?: LayoutRequirement[];
}

export interface SpatialMetricsData {
  terraceArea: number;
  totalSeats: number;
  spacePerSeat: number;
  densityLevel: string;
  densityLabel: string;
  feasibility: string; // "good" | "compact" | "overcrowded"
  feasibilityLabel: string;
  feasibilityDescription: string;
  maxSeatsComfortable: number;
  maxSeatsBalanced: number;
  maxSeatsDense: number;
  estimatedOccupiedSurface: number;
  remainingCirculationSpace: number;
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
  layoutRequirementType?: LayoutRequirementType;
  layoutRequirementLabel?: string;
  layoutRequirementId?: string;
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
