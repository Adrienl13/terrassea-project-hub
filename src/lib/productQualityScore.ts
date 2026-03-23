import type { DBProduct } from "@/lib/products";

export interface QualityReport {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missingFields: string[];
  suggestions: string[];
}

export function computeProductQuality(
  productData: Partial<DBProduct>
): QualityReport {
  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  // Name filled: +5
  if (productData.name && productData.name.trim().length > 0) {
    score += 5;
    strengths.push("Product name provided");
  } else {
    missingFields.push("name");
  }

  // Category + subcategory: +5
  if (productData.category) {
    score += 3;
    if (productData.subcategory) {
      score += 2;
      strengths.push("Category and subcategory defined");
    } else {
      score += 0;
      suggestions.push("Add a subcategory for better classification");
    }
  } else {
    missingFields.push("category");
  }

  // Short description (>20 chars): +8
  if (
    productData.short_description &&
    productData.short_description.length > 20
  ) {
    score += 8;
    strengths.push("Short description provided");
  } else if (productData.short_description) {
    score += 3;
    suggestions.push("Short description should be at least 20 characters");
  } else {
    missingFields.push("short_description");
  }

  // Long description (>50 chars): +7
  if (
    productData.long_description &&
    productData.long_description.length > 50
  ) {
    score += 7;
    strengths.push("Detailed long description");
  } else if (productData.long_description) {
    score += 3;
    suggestions.push("Long description should be at least 50 characters");
  } else {
    missingFields.push("long_description");
  }

  // Main image: +10
  if (productData.image_url) {
    score += 10;
    strengths.push("Main product image uploaded");
  } else {
    missingFields.push("image_url");
    weaknesses.push("No main product image");
  }

  // Gallery (3+ photos): +8
  const galleryCount = productData.gallery_urls?.length ?? 0;
  if (galleryCount >= 3) {
    score += 8;
    strengths.push(`${galleryCount} gallery photos`);
  } else if (galleryCount > 0) {
    score += Math.round((galleryCount / 3) * 8);
    suggestions.push(`Add more gallery photos (${galleryCount}/3 minimum)`);
  } else {
    missingFields.push("gallery_urls");
  }

  // Environment photos (1+): +5
  const envCount = productData.environment_urls?.length ?? 0;
  if (envCount >= 1) {
    score += 5;
    strengths.push("Environment/lifestyle photos provided");
  } else {
    missingFields.push("environment_urls");
    suggestions.push("Add environment photos showing the product in context");
  }

  // Dimensions (L x W x H): +7
  const hasDims =
    productData.dimensions_length_cm != null &&
    productData.dimensions_width_cm != null &&
    productData.dimensions_height_cm != null;
  if (hasDims) {
    score += 7;
    strengths.push("Full dimensions provided (L x W x H)");
  } else {
    const dimCount = [
      productData.dimensions_length_cm,
      productData.dimensions_width_cm,
      productData.dimensions_height_cm,
    ].filter((d) => d != null).length;
    if (dimCount > 0) {
      score += Math.round((dimCount / 3) * 7);
      suggestions.push("Complete all three dimensions (length, width, height)");
    } else {
      missingFields.push("dimensions");
    }
  }

  // Weight: +3
  if (productData.weight_kg != null) {
    score += 3;
    strengths.push("Weight specified");
  } else {
    missingFields.push("weight_kg");
  }

  // Materials (structure + seat): +5
  if (productData.material_structure) {
    score += 3;
    if (productData.material_seat) {
      score += 2;
      strengths.push("Materials fully documented");
    } else {
      suggestions.push("Add seat material information");
    }
  } else {
    missingFields.push("material_structure");
  }

  // Style tags (2+): +5
  const styleTags = productData.style_tags?.length ?? 0;
  if (styleTags >= 2) {
    score += 5;
    strengths.push("Style tags defined");
  } else if (styleTags > 0) {
    score += 2;
    suggestions.push("Add more style tags (2+ recommended)");
  } else {
    missingFields.push("style_tags");
  }

  // Ambience tags (1+): +3
  const ambienceTags = productData.ambience_tags?.length ?? 0;
  if (ambienceTags >= 1) {
    score += 3;
    strengths.push("Ambience tags defined");
  } else {
    missingFields.push("ambience_tags");
  }

  // Material tags (2+): +5
  const materialTags = productData.material_tags?.length ?? 0;
  if (materialTags >= 2) {
    score += 5;
    strengths.push("Material tags documented");
  } else if (materialTags > 0) {
    score += 2;
    suggestions.push("Add more material tags (2+ recommended)");
  } else {
    missingFields.push("material_tags");
  }

  // Use case tags (1+): +3
  const useCaseTags = productData.use_case_tags?.length ?? 0;
  if (useCaseTags >= 1) {
    score += 3;
    strengths.push("Use case tags defined");
  } else {
    missingFields.push("use_case_tags");
  }

  // Color info: +3
  if (productData.main_color || (productData.available_colors?.length ?? 0) > 0) {
    score += 3;
    strengths.push("Color information provided");
  } else {
    missingFields.push("color");
  }

  // Price range: +5
  if (productData.price_min != null || productData.price_max != null || productData.indicative_price) {
    score += 5;
    strengths.push("Pricing information available");
  } else {
    missingFields.push("price");
  }

  // Stock status: +3
  if (productData.stock_status) {
    score += 3;
    strengths.push("Stock status indicated");
  } else {
    missingFields.push("stock_status");
  }

  // Delivery days: +3
  if (productData.estimated_delivery_days != null) {
    score += 3;
    strengths.push("Delivery time specified");
  } else {
    missingFields.push("estimated_delivery_days");
  }

  // Technical booleans (at least 3 set explicitly): +3
  const technicalBooleans = [
    productData.is_outdoor,
    productData.is_stackable,
    productData.is_chr_heavy_use,
    productData.uv_resistant,
    productData.weather_resistant,
    productData.fire_retardant,
    productData.lightweight,
    productData.easy_maintenance,
    productData.customizable,
    productData.dismountable,
    productData.requires_assembly,
  ];
  const setBooleans = technicalBooleans.filter((b) => b === true).length;
  if (setBooleans >= 3) {
    score += 3;
    strengths.push("Technical properties documented");
  } else if (setBooleans > 0) {
    score += 1;
    suggestions.push("Document more technical properties (outdoor, stackable, etc.)");
  } else {
    missingFields.push("technical_properties");
  }

  // Country of manufacture: +3
  if (productData.country_of_manufacture) {
    score += 3;
    strengths.push("Country of manufacture specified");
  } else {
    missingFields.push("country_of_manufacture");
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return { score, strengths, weaknesses, missingFields, suggestions };
}
