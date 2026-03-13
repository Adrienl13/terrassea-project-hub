export interface ProjectParameters {
  establishmentType: string;
  projectZone: string;
  seatingCapacity: number | null;
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
}

export interface RecommendedProduct {
  productId: string;
  relevanceScore: number;
  reason: string;
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
