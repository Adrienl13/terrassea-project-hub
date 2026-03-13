import productChair1 from "@/assets/product-chair-1.jpg";
import productChair2 from "@/assets/product-chair-2.jpg";
import productArmchair1 from "@/assets/product-armchair-1.jpg";
import productTable1 from "@/assets/product-table-1.jpg";
import productTable2 from "@/assets/product-table-2.jpg";
import productBarstool1 from "@/assets/product-barstool-1.jpg";
import productParasol1 from "@/assets/product-parasol-1.jpg";
import productLounge1 from "@/assets/product-lounge-1.jpg";

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

export const products: Product[] = [
  {
    id: "1",
    name: "Riviera Dining Chair",
    description: "Woven rope seat with solid teak frame. Weather-resistant outdoor dining.",
    price: "From €320",
    category: "Chairs",
    image: productChair1,
    style: "Mediterranean",
    material: "Teak & Rope",
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
  },
];
