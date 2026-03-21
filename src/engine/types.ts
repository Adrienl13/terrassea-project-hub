import type { DBProduct } from "@/lib/products";

// ═══════════════════════════════════════════════════════════
// PROJECT PARAMETERS
// ═══════════════════════════════════════════════════════════

export type ProductCategorySelection =
  | "chairs"
  | "armchairs"
  | "tables"
  | "bar-stools"
  | "parasols"
  | "sun-loungers"
  | "lounge-seating"
  | "benches"
  | "accessories";

export interface ProjectParameters {
  builderMode:          "guided" | "expert" | "";
  establishmentType:    string;
  projectZone:          string;
  seatingCapacity:      number | null;
  seatingLayout:        string;
  layoutPriority:       string;
  style:                string[];
  ambience:             string[];
  colorPalette:         string[];
  materialPreferences:  string[];
  technicalConstraints: string[];
  isOutdoor:            boolean;
  budgetLevel:          string;
  timeline:             string;
  terraceSurfaceM2:     number | null;
  terraceLength:        number | null;
  terraceWidth:         number | null;
  tableMix?:            TableMixEntry[];
  /** Selected product categories — null = "complete proposal" (all venue-relevant) */
  selectedCategories?:  ProductCategorySelection[] | null;
}

export interface TableMixEntry {
  format:       string;
  quantity:     number;
  seatsPerTable: number;
}

// ═══════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════

export type LayoutRequirementType =
  | "chair"
  | "armchair"
  | "complete_table"
  | "table_base"
  | "tabletop"
  | "parasol"
  | "sun_lounger"
  | "bar_stool"
  | "sofa"
  | "other";

export interface LayoutRequirement {
  id:               string;
  type:             LayoutRequirementType;
  label:            string;
  requiredQuantity: number;
  tableFormat?:     string;
}

export interface TableGroup {
  tableFormat:   string;
  shape:         string;
  quantity:      number;
  seatsPerTable: number;
  totalSeats:    number;
}

export interface SpatialMetricsData {
  terraceArea:                number;
  totalSeats:                 number;
  spacePerSeat:               number;
  densityLevel:               string;
  densityLabel:               string;
  feasibility:                string;
  feasibilityLabel:           string;
  feasibilityDescription:     string;
  maxSeatsComfortable:        number;
  maxSeatsBalanced:           number;
  maxSeatsDense:              number;
  estimatedOccupiedSurface:   number;
  remainingCirculationSpace:  number;
}

export interface LayoutRecommendation {
  label:           string;
  totalSeats:      number;
  tableGroups:     TableGroup[];
  chairCount:      number;
  notes:           string;
  spatialMetrics?: SpatialMetricsData;
  requirements?:   LayoutRequirement[];
}

// ═══════════════════════════════════════════════════════════
// BOM — Bill of Materials
// ═══════════════════════════════════════════════════════════

export type BOMSlotRole =
  | "chair"
  | "armchair"
  | "bar_stool"
  | "complete_table"
  | "table_base"
  | "tabletop"
  | "parasol"
  | "sun_lounger"
  | "sofa"
  | "bench"
  | "accessory"
  | "other";

export interface BOMSlot {
  role:             BOMSlotRole;
  quantity:         number;
  product:          DBProduct;
  archetypeId:      string | null;
  relevanceScore:   number;
  reason:           string;
  layoutRequirementId?:    string;
  layoutRequirementType?:  LayoutRequirementType;
  layoutRequirementLabel?: string;
  tableFormat?:   string;
  isModular?:     boolean;
  base?:          DBProduct;
  top?:           DBProduct;
  unitPriceMin:   number | null;
  unitPriceMax:   number | null;
  slotTotalMin:   number | null;
  slotTotalMax:   number | null;
}

export interface ConceptBOM {
  slots:            BOMSlot[];
  totalItems:       number;
  indicativeTotalMin: number | null;
  indicativeTotalMax: number | null;
  missingSlots:     BOMSlotRole[];
}

// ═══════════════════════════════════════════════════════════
// CONCEPT ALTERNATIVE
// ═══════════════════════════════════════════════════════════

export interface ConceptAlternative {
  label:             string;
  changedSlots:      BOMSlotRole[];
  slots:             BOMSlot[];
  priceDelta:        number;
  alternativeReason: string;
}

// ═══════════════════════════════════════════════════════════
// PROJECT CONCEPT
// ═══════════════════════════════════════════════════════════

export interface ProjectConcept {
  id:           string;
  title:        string;
  description:  string;
  colorPalette:  string[];
  colorNames:    string[];
  moodKeywords:  string[];
  layout?: LayoutRecommendation;
  bom?: ConceptBOM;
  alternative?: ConceptAlternative;
  priceRange?: {
    min: number | null;
    max: number | null;
  };
  cohesionScore?: number;
  deliveryPenalty?: number;
  maxDeliveryDays?: number | null;
  products: RecommendedProduct[];
}

// ═══════════════════════════════════════════════════════════
// RECOMMENDED PRODUCT (legacy)
// ═══════════════════════════════════════════════════════════

export interface RecommendedProduct {
  productId:             string;
  relevanceScore:        number;
  reason:                string;
  suggestedQuantity?:    number;
  layoutRequirementType?:  LayoutRequirementType;
  layoutRequirementLabel?: string;
  layoutRequirementId?:    string;
}

// ═══════════════════════════════════════════════════════════
// DISCOVERY
// ═══════════════════════════════════════════════════════════

export interface DiscoveryQuestion {
  id:       string;
  question: string;
  options:  string[];
  field:    keyof ProjectParameters | "raw";
  priority: number;
}

export interface ProjectSummary {
  establishment: string;
  zone:          string;
  style:         string;
  ambience:      string;
  capacity:      string;
  layout:        string;
  layoutPriority: string;
  palette:       string;
  materials:     string;
  constraints:   string;
}

// ═══════════════════════════════════════════════════════════
// SCORING CONTEXT
// ═══════════════════════════════════════════════════════════

export interface ClimateProfile {
  isCoastal:    boolean;
  isHighUV:     boolean;
  isHighTraffic: boolean;
  isElevated:   boolean;
}

export interface VenueNeeds {
  mandatory:              string[];
  preferred:              string[];
  boost:                  number;
  technicalRequirements:  string[];
}

// ═══════════════════════════════════════════════════════════
// LEGACY — kept for backward compat with data/products.ts
// ═══════════════════════════════════════════════════════════

export interface EnrichedProduct {
  id:          string;
  name:        string;
  description: string;
  price:       string;
  category:    string;
  image:       string;
  style:       string;
  material:    string;
  tags:        ProductTags;
  scoring:     ProductScoring;
}

export interface ProductTags {
  style:     string[];
  ambience:  string[];
  color:     string[];
  useCase:   string[];
  technical: string[];
}

export interface ProductScoring {
  popularity:      number;
  complementarity: Record<string, number>;
  diversityGroup:  string;
}
