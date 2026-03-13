export interface ProjectParameters {
  establishmentType: string;
  projectZone: string;
  seatingCapacity: number | null;
  style: string[];
  ambience: string[];
  colorPalette: string[];
  materialPreferences: string[];
  technicalConstraints: string[];
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
  popularity: number;       // 0-1
  complementarity: Record<string, number>; // productId -> score 0-1
  diversityGroup: string;   // to ensure variety
}
