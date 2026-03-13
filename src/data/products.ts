import productChair1 from "@/assets/product-chair-1.jpg";
import productChair2 from "@/assets/product-chair-2.jpg";
import productArmchair1 from "@/assets/product-armchair-1.jpg";
import productTable1 from "@/assets/product-table-1.jpg";
import productTable2 from "@/assets/product-table-2.jpg";
import productBarstool1 from "@/assets/product-barstool-1.jpg";
import productParasol1 from "@/assets/product-parasol-1.jpg";
import productLounge1 from "@/assets/product-lounge-1.jpg";
import { EnrichedProduct } from "@/engine/types";

// Keep backward compat
export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  style: string;
  material: string;
}

export const enrichedProducts: EnrichedProduct[] = [
  {
    id: "1",
    name: "Riviera Dining Chair",
    description: "Woven rope seat with solid teak frame. Weather-resistant outdoor dining.",
    price: "From €320",
    category: "Chairs",
    image: productChair1,
    style: "Mediterranean",
    material: "Teak & Rope",
    tags: {
      style: ["mediterranean", "coastal", "natural", "artisan"],
      ambience: ["warm", "relaxed", "sun-drenched", "casual-elegant"],
      color: ["natural", "beige", "warm-wood", "sand"],
      useCase: ["restaurant-terrace", "hotel-garden", "beach-club", "outdoor-dining"],
      technical: ["weather-resistant", "stackable-no", "uv-resistant", "easy-clean"],
    },
    scoring: {
      popularity: 0.85,
      complementarity: { "3": 0.95, "5": 0.8, "6": 0.6 },
      diversityGroup: "dining-seating",
    },
  },
  {
    id: "2",
    name: "Côte Lounge Armchair",
    description: "Deep cushioned armchair with brushed aluminum frame. Sunbrella fabric.",
    price: "From €890",
    category: "Armchairs",
    image: productArmchair1,
    style: "Modern",
    material: "Aluminum & Fabric",
    tags: {
      style: ["modern", "minimalist", "luxury", "contemporary"],
      ambience: ["sophisticated", "lounge", "evening", "premium"],
      color: ["gray", "charcoal", "neutral", "slate"],
      useCase: ["hotel-lobby", "rooftop-lounge", "vip-area", "pool-deck"],
      technical: ["sunbrella-fabric", "lightweight", "rust-proof", "cushion-removable"],
    },
    scoring: {
      popularity: 0.78,
      complementarity: { "6": 0.9, "8": 0.85, "5": 0.75 },
      diversityGroup: "lounge-seating",
    },
  },
  {
    id: "3",
    name: "Soleil Round Table",
    description: "Teak top with sculptural iron base. Seats 4 comfortably.",
    price: "From €750",
    category: "Tables",
    image: productTable1,
    style: "Contemporary",
    material: "Teak & Iron",
    tags: {
      style: ["contemporary", "sculptural", "warm-modern", "organic"],
      ambience: ["convivial", "intimate", "daytime", "casual-elegant"],
      color: ["warm-wood", "black", "natural", "earth"],
      useCase: ["restaurant-terrace", "cafe", "hotel-breakfast", "bistro"],
      technical: ["seats-4", "heavy-base", "weather-resistant", "stable"],
    },
    scoring: {
      popularity: 0.82,
      complementarity: { "1": 0.95, "7": 0.85, "5": 0.8 },
      diversityGroup: "dining-tables",
    },
  },
  {
    id: "4",
    name: "Porto Bar Stool",
    description: "Hand-woven natural rattan on powder-coated steel frame.",
    price: "From €280",
    category: "Bar Stools",
    image: productBarstool1,
    style: "Natural",
    material: "Rattan & Steel",
    tags: {
      style: ["natural", "bohemian", "coastal", "artisan"],
      ambience: ["lively", "social", "tropical", "casual"],
      color: ["natural", "honey", "rattan", "warm"],
      useCase: ["bar-counter", "beach-club", "rooftop-bar", "pool-bar"],
      technical: ["counter-height", "lightweight", "indoor-outdoor", "hand-woven"],
    },
    scoring: {
      popularity: 0.72,
      complementarity: { "5": 0.7, "3": 0.6, "1": 0.75 },
      diversityGroup: "bar-seating",
    },
  },
  {
    id: "5",
    name: "Horizon Parasol 3m",
    description: "Commercial-grade tilting parasol. UV50+ protection, wind-resistant.",
    price: "From €1,200",
    category: "Parasols",
    image: productParasol1,
    style: "Classic",
    material: "Aluminum & Canvas",
    tags: {
      style: ["classic", "clean", "professional", "timeless"],
      ambience: ["sun-protection", "daytime", "al-fresco", "comfortable"],
      color: ["white", "ecru", "sand", "neutral"],
      useCase: ["restaurant-terrace", "hotel-pool", "beach-club", "cafe"],
      technical: ["uv50-plus", "wind-resistant", "tilting", "commercial-grade"],
    },
    scoring: {
      popularity: 0.9,
      complementarity: { "1": 0.8, "3": 0.8, "7": 0.85, "6": 0.7 },
      diversityGroup: "shade",
    },
  },
  {
    id: "6",
    name: "Terrazza Lounge Sofa",
    description: "Two-seater outdoor sofa with teak frame and all-weather cushions.",
    price: "From €1,650",
    category: "Lounge Seating",
    image: productLounge1,
    style: "Scandinavian",
    material: "Teak & Fabric",
    tags: {
      style: ["scandinavian", "minimalist", "warm-modern", "refined"],
      ambience: ["relaxing", "lounge", "sunset", "intimate"],
      color: ["light-gray", "natural-wood", "white", "soft"],
      useCase: ["hotel-lounge", "rooftop", "pool-deck", "garden"],
      technical: ["all-weather-cushion", "teak-frame", "modular-no", "heavy-duty"],
    },
    scoring: {
      popularity: 0.88,
      complementarity: { "2": 0.9, "8": 0.8, "5": 0.7 },
      diversityGroup: "lounge-seating",
    },
  },
  {
    id: "7",
    name: "Bistro Stackable Chair",
    description: "Lightweight aluminum bistro chair. Stackable for easy storage.",
    price: "From €195",
    category: "Chairs",
    image: productChair2,
    style: "Industrial",
    material: "Aluminum",
    tags: {
      style: ["industrial", "urban", "functional", "modern"],
      ambience: ["energetic", "bustling", "daytime", "vibrant"],
      color: ["silver", "metallic", "gray", "cool"],
      useCase: ["cafe", "bistro", "fast-casual", "event-space"],
      technical: ["stackable", "lightweight", "rust-proof", "easy-storage"],
    },
    scoring: {
      popularity: 0.75,
      complementarity: { "3": 0.85, "5": 0.85, "8": 0.7 },
      diversityGroup: "dining-seating",
    },
  },
  {
    id: "8",
    name: "Marble Dining Table",
    description: "Rectangular marble top on black iron legs. Seats 6.",
    price: "From €1,900",
    category: "Tables",
    image: productTable2,
    style: "Modern",
    material: "Marble & Iron",
    tags: {
      style: ["modern", "luxury", "bold", "statement"],
      ambience: ["sophisticated", "evening", "fine-dining", "premium"],
      color: ["white-marble", "black", "contrast", "monochrome"],
      useCase: ["fine-dining", "hotel-restaurant", "rooftop", "vip-area"],
      technical: ["seats-6", "heavy", "covered-area-recommended", "premium-finish"],
    },
    scoring: {
      popularity: 0.7,
      complementarity: { "2": 0.85, "7": 0.7, "6": 0.8 },
      diversityGroup: "dining-tables",
    },
  },
];

// Backward-compatible export
export const products: Product[] = enrichedProducts.map(({ tags, scoring, ...p }) => p);
