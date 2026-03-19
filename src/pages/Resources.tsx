import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight, Armchair, Layers, Sun, Ruler, Scale } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { TOPIC_ILLUSTRATIONS, SIDEBAR_ILLUSTRATIONS } from "@/components/resources/ResourceIllustrations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
  tip?: string;
  tags?: string[];
}

interface Topic {
  id: string;
  icon: React.ElementType;
  label: string;
  subtitle: string;
  color: string;
  photo: string;          // hero card photo URL
  photoAlt: string;
  sidebarProducts: SidebarProduct[];
  guide: { title: string; body: string };
  expert: string;
  faqs: FAQItem[];
  cta: { label: string; href: string };
}

interface SidebarProduct {
  name: string;
  category: string;
  image: string;
  tag: string;   // short highlight tag
  href: string;
}

// ── Sidebar product data per topic ────────────────────────────────────────────
// Images: curated Unsplash photos matching each product category

const SIDEBAR_SEATING: SidebarProduct[] = [
  {
    name: "Bistrot Stackable Chair",
    category: "Chairs",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    tag: "CHR heavy-use",
    href: "/products?category=chairs",
  },
  {
    name: "Rope Armchair",
    category: "Armchairs",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    tag: "Premium comfort",
    href: "/products?category=armchairs",
  },
  {
    name: "Teak Bar Stool",
    category: "Bar Stools",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&q=80",
    tag: "With footrest",
    href: "/products?category=bar-stools",
  },
];

const SIDEBAR_MATERIALS: SidebarProduct[] = [
  {
    name: "Marine-grade Aluminium",
    category: "Chairs",
    image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80",
    tag: "Coastal certified",
    href: "/products?material=aluminium",
  },
  {
    name: "FSC Teak Collection",
    category: "Tables",
    image: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=400&q=80",
    tag: "Grade A FSC",
    href: "/products?material=teak",
  },
  {
    name: "Rope-woven Armchair",
    category: "Armchairs",
    image: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&q=80",
    tag: "Weather resistant",
    href: "/products?material=rope",
  },
];

const SIDEBAR_SHADE: SidebarProduct[] = [
  {
    name: "Cantilever Parasol 3m",
    category: "Parasols",
    image: "https://images.unsplash.com/photo-1601628828688-632f38a5a7d0?w=400&q=80",
    tag: "Beaufort 6",
    href: "/products?category=parasols",
  },
  {
    name: "Pool Sun Lounger",
    category: "Sun Loungers",
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80",
    tag: "Quick-dry cushion",
    href: "/products?category=sun-loungers",
  },
  {
    name: "Centre-pole Parasol 4m",
    category: "Parasols",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
    tag: "UPF 50+",
    href: "/products?category=parasols",
  },
];

const SIDEBAR_LAYOUT: SidebarProduct[] = [
  {
    name: "HPL Dining Table 70×70",
    category: "Tables",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80",
    tag: "2-cover standard",
    href: "/products?category=tables",
  },
  {
    name: "Teak Table 120×70",
    category: "Tables",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80",
    tag: "4-cover dining",
    href: "/products?category=tables",
  },
  {
    name: "High Table 80×80 Bar",
    category: "High Tables",
    image: "https://images.unsplash.com/photo-1574096079513-d8259312b785?w=400&q=80",
    tag: "Height 110cm",
    href: "/products?category=tables",
  },
];

const SIDEBAR_REGULATIONS: SidebarProduct[] = [
  {
    name: "EN 12727 Certified Chair",
    category: "Chairs",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80",
    tag: "Level 4 certified",
    href: "/products",
  },
  {
    name: "Fire-retardant Cushion",
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
    tag: "NF P 92-507",
    href: "/products",
  },
  {
    name: "CHR Contract Armchair",
    category: "Armchairs",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80",
    tag: "3-year warranty",
    href: "/products",
  },
];

// ── Topic data ────────────────────────────────────────────────────────────────

const TOPICS: Topic[] = [
  {
    id: "seating",
    icon: Armchair,
    label: "Seating",
    subtitle: "Chairs, armchairs, stools & benches",
    color: "#D4603A",
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80",
    photoAlt: "Restaurant terrace with chairs",
    sidebarProducts: SIDEBAR_SEATING,
    guide: {
      title: "How to choose the right seating for your establishment",
      body: `Outdoor seating in a professional CHR setting is subject to constraints that residential furniture simply cannot meet. A terrace chair typically endures 6 to 8 hours of continuous use per day, exposure to UV radiation, humidity cycles, and weekly cleaning with commercial-grade products. Choosing the wrong product means replacement within 2-3 seasons — a cost that far exceeds the initial saving.

The first decision is functional: stackable or non-stackable. Stackable chairs are the default choice for seasonal venues (beach clubs, event spaces, hotel pool decks) because they reduce storage volume by 80% and simplify end-of-season logistics. For permanent year-round terraces — brasseries, hotel restaurants — non-stackable chairs with armrests create a premium perception and improve guest comfort during long meals.

The second decision is structural: bistrot frame, sled base, or 4-leg. Bistrot frames (curved back legs) offer excellent stability on uneven paving but are harder to maintain clean. Sled bases slide easily for repositioning. 4-leg square frames are the most universal and have the widest product range.`,
    },
    expert: "For a restaurant with an average cover time above 90 minutes, invest in a chair with a seat depth of at least 42cm and lumbar support. Comfort directly impacts table turnover — guests who are uncomfortable leave earlier, which is counterproductive. Guests who are comfortable stay, order dessert, and return.",
    faqs: [
      {
        q: "What is the difference between a bistrot chair and a standard outdoor chair?",
        a: `A bistrot chair is defined by its structural typology: a continuous frame where the back legs extend upward to form the backrest support, traditionally in bent beechwood or, in modern CHR versions, powder-coated aluminium or polypropylene. This design originates from Parisian café culture and offers two key advantages: it is lightweight (typically 3.5–5kg), making it easy to reposition, and stackable in most versions. However, bistrot chairs have a relatively narrow seat (38–40cm) and low back height, making them less suitable for venues where guests sit for more than 90 minutes. For long-format dining, a chair with a higher back and wider seat (42–46cm) significantly improves comfort and perceived quality.`,
        tip: "A bistrot chair that weighs under 4kg is stackable up to 8 high — ideal if you're clearing a terrace nightly.",
        tags: ["Seating type", "CHR standard"],
      },
      {
        q: "How many chairs and tables do I actually need for a given terrace surface?",
        a: `The French CHR standard recommends a minimum of 1.5m² per cover in a standard bistrot configuration and 2m² per cover for a premium or brasserie layout. Circulation aisles (access between tables for staff and guests) require a minimum clear width of 90cm between chair backs. In practice, for a 60m² terrace with a balanced 2 and 4-seater mix and correct circulation, you can typically fit 32 to 40 covers. Going beyond this without increasing service staff creates bottlenecks that directly damage the guest experience. Our Project Builder calculates this automatically based on your surface and seating layout preference.`,
        tip: "The most common mistake is filling the terrace to maximum theoretical capacity. A terrace at 75% of its maximum is more profitable per cover than one at 100%.",
        tags: ["Layout", "CHR norm"],
      },
      {
        q: "What seat height is compatible with standard outdoor terrace tables?",
        a: `Standard outdoor dining tables have a height of 74–76cm. The correct seat height for this table range is 44–46cm, leaving an ergonomic gap of 28–32cm between seat and tabletop — the standard comfort range for dining. For high tables and bar counters (90–110cm height), bar stools with a seat height of 60–75cm and a footrest are required. Mixing seat heights on the same terrace without clear visual zoning creates a dissonant impression and leads to ergonomic complaints. If you are considering a mixed layout (dining tables + high bar counter), treat them as separate zones with different furniture families.`,
        tags: ["Dimensions", "Ergonomics"],
      },
      {
        q: "Why are stackable chairs the industry default for seasonal venues?",
        a: `At the end of a season, a beach club with 120 chairs needs to store them efficiently, protect them from winter conditions, and redeploy them the following spring without damage. A non-stackable chair requires approximately 0.5m² of floor space. 120 chairs = 60m² of dedicated storage. The same chairs in a stackable version, stacked 8 high, require 7.5m². That difference alone justifies the choice. Additionally, stackable chairs in powder-coated aluminium or UV-stabilised polypropylene are designed to handle repeated stacking without surface degradation — a quality standard that residential stackable furniture does not meet.`,
        tip: "Always verify the manufacturer's maximum stacking height. Stacking beyond 8 on outdoor surfaces can cause micro-abrasions and damage the finish.",
        tags: ["Logistics", "Seasonal"],
      },
      {
        q: "When does it make sense to invest in armchairs rather than chairs?",
        a: `Armchairs add 15–25% to the per-unit cost and reduce terrace density by approximately 20% compared to standard chairs. They are justified when the average revenue per cover exceeds €40–50 (à la carte dining, cocktail bar, hotel restaurant) and when cover time is above 90 minutes. In those contexts, armchairs signal a positioning upgrade that guests perceive immediately and translate into higher spend. For a quick-service brasserie or café with a 45-minute average cover time, armchairs are a poor investment — the density loss outweighs the perception gain.`,
        tags: ["ROI", "Premium"],
      },
    ],
    cta: { label: "Browse seating", href: "/products?category=chairs" },
  },
  {
    id: "materials",
    icon: Layers,
    label: "Materials",
    subtitle: "Teak, aluminium, resin, rope & composites",
    color: "#8B7355",
    photo: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80",
    photoAlt: "Hotel pool terrace with premium furniture",
    sidebarProducts: SIDEBAR_MATERIALS,
    guide: {
      title: "The complete material guide for outdoor hospitality furniture",
      body: `Material selection for CHR outdoor furniture is a decision that determines maintenance cost, lifecycle, guest experience, and environmental impact simultaneously. There is no universally superior material — every material is a trade-off between performance, aesthetics, maintenance requirements, and budget.

The three dominant materials in European CHR outdoor furniture are powder-coated aluminium, teak, and UV-stabilised polypropylene. Each serves a distinct use case. Aluminium is the industrial workhorse: corrosion-proof, lightweight, infinitely colour-customisable, and recyclable. Teak is the premium natural benchmark: its natural silica content makes it inherently resistant to moisture and insects without treatment, but it requires annual oiling to maintain colour. Polypropylene is the economic baseline: low cost, low maintenance, but with a shorter aesthetic lifespan (5–8 years before UV fade becomes visible).

Two emerging materials deserve attention for premium CHR applications: rope-woven aluminium frames and recycled-content composites. Rope weaving (polyester or acrylic on powder-coated aluminium frames) offers the aesthetic of wicker with full weather resistance and easy cleaning. Recycled composites (HDPE from reclaimed plastics) are increasingly specified in sustainable hotel procurement.`,
    },
    expert: "The most expensive mistake in outdoor CHR furniture procurement is choosing a material based on catalogue photos rather than tested performance in your specific climate. A teak chair photographed in a Marseille showroom behaves very differently on a North Sea hotel terrace. Always ask the supplier for climate-specific references.",
    faqs: [
      {
        q: "What is the most durable material for a beach club or coastal venue?",
        a: `In a coastal environment with high salt air concentration (within 5km of the sea), standard steel hardware corrodes within 2–3 seasons, and certain aluminium alloys with insufficient anodisation will show pitting. For coastal CHR use, the specified minimum is marine-grade aluminium (alloy 6061 or 6082, with 15–20 micron anodisation before powder coating) or full 316L stainless steel hardware. The frame finish should be polyester powder coating at minimum 60 microns thickness — thinner coatings blister in salt air within 18 months. Teak, thermally modified ash, and HDPE composites are also fully salt-resistant. Avoid wrought iron and untreated cast aluminium entirely in coastal settings.`,
        tip: "Ask your supplier specifically: 'What is the alloy grade and coating thickness?' A supplier who cannot answer this question is not manufacturing to CHR coastal standard.",
        tags: ["Coastal", "Marine grade", "Durability"],
      },
      {
        q: "Is teak worth the investment for a professional outdoor setting?",
        a: `Teak (Tectona grandis) contains natural teak oil and silica that make it resistant to moisture, insects, and UV without any treatment — a property no other widely available hardwood matches. Grade A teak from managed FSC-certified plantations has an outdoor lifespan of 25–35 years with minimal maintenance. The maintenance requirement is purely aesthetic: without annual oiling, teak weathers to a silver-grey patina that many operators find attractive. With annual oiling (1 hour per 10 chairs), it maintains its warm honey colour. The investment is justified for permanent, year-round terraces at hotel restaurants or premium brasseries. For seasonal venues or high-volume bistros with frequent chair repositioning, teak's weight (8–12kg per chair) is a practical disadvantage. Powder-coated aluminium with teak effect is a viable alternative.`,
        tip: "Teak quality varies enormously. The density should be at least 630kg/m³ for Grade A. Lower density means more porosity, faster weathering, and shorter lifespan.",
        tags: ["Teak", "Premium", "Maintenance"],
      },
      {
        q: "What is the difference between polypropylene and fibreglass-reinforced polypropylene for CHR use?",
        a: `Standard injection-moulded polypropylene (PP) is the base material for most budget outdoor chairs. It is light, cheap, and colourfast for 3–5 years under normal UV exposure. The problem in a professional CHR context is flex fatigue: under the weight cycles and movement of daily commercial use, standard PP develops micro-cracks in load-bearing sections after 4–7 years. Fibreglass-reinforced polypropylene (PP-GF, typically 20–30% glass fibre by weight) is structurally stiffer, has approximately 40% higher impact resistance, and maintains its shape under heat (no warping on dark-coloured terraces in summer). For CHR applications where chairs are moved, stacked, and sat on 200+ days per year, PP-GF is the correct specification. Standard PP is acceptable for indoor-only or very low-use applications.`,
        tags: ["Polypropylene", "Technical specs", "Structural"],
      },
      {
        q: "How do I clean and maintain outdoor furniture without damaging the finish?",
        a: `Powder-coated aluminium: clean weekly with a mild soap solution (pH 6–8) and a soft cloth. Avoid abrasive cleaners, bleach-based products, and high-pressure washing above 30 bar — these remove the coating. Annual inspection for chips or scratches is recommended; touch-up paint prevents corrosion ingress. Teak: clean with a soft brush and teak cleaner twice per season. Apply teak oil annually if colour preservation is desired. Never use a pressure washer on teak — it opens the grain and accelerates weathering. Synthetic rope: rinse with fresh water after coastal use. UV-stabilised acrylic rope (Batyline, Sunbrella) can be cleaned with a diluted bleach solution (5%) without colour degradation. Natural rattan: not suitable for permanently outdoor use in European climates — use only in covered or semi-covered spaces.`,
        tip: "The biggest cause of premature furniture degradation is end-of-season storage without cleaning. Salt, bird droppings, and organic residue are corrosive. Always clean before covering or storing.",
        tags: ["Maintenance", "Cleaning", "Longevity"],
      },
      {
        q: "What sustainability certifications should I look for in outdoor CHR furniture?",
        a: `The three most relevant certifications for European CHR procurement are FSC (Forest Stewardship Council) for wood products, Greenguard Gold for indoor VOC emissions, and OEKO-TEX Standard 100 for textiles and rope materials. For aluminium products, ask for the recycled content percentage — leading manufacturers use 75–95% recycled aluminium in their alloy, reducing embodied carbon by approximately 90% versus primary production. For a hotel or restaurant pursuing BREEAM, LEED, or HQE certification, furniture procurement with documented sustainability credentials contributes to material and resource credits. EU Ecolabel certification for furniture, while not yet mandatory, signals a commitment to lifecycle assessment that is increasingly required in public procurement and luxury hotel group sourcing.`,
        tags: ["Sustainability", "FSC", "Certification"],
      },
    ],
    cta: { label: "Filter by material", href: "/products?filter=material" },
  },
  {
    id: "shade",
    icon: Sun,
    label: "Shade & Comfort",
    subtitle: "Parasols, sun loungers & pergolas",
    color: "#4A90A4",
    photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80",
    photoAlt: "Beach club with parasols and sun loungers",
    sidebarProducts: SIDEBAR_SHADE,
    guide: {
      title: "Shade planning for hospitality outdoor spaces",
      body: `Shade planning is one of the most underestimated aspects of outdoor hospitality design. A terrace without adequate shade loses 60–70% of its covers during peak summer hours — not because guests don't want to be outside, but because direct sun exposure without protection is physically uncomfortable after 30 minutes. Effective shade management is therefore a direct revenue driver.

The primary shade solutions for CHR outdoor settings are cantilever parasols, centre-pole parasols, shade sails, and fixed pergola structures. Each has a distinct application profile. Cantilever parasols (lateral arm) are the premium default for hotel pool decks and beach clubs — they provide unobstructed shade without a central pole interfering with table or sunbed placement. Centre-pole parasols are the standard for restaurant terraces — lower cost, greater stability in wind, and available in larger diameters (up to 5m round or 4×4m square).

The parasol diameter selection is driven by the table configuration it serves. A 2m diameter round parasol covers one 70×70cm table with four chairs to a comfort standard. A 3m diameter parasol covers two adjacent 70×70cm tables. For 80×80cm or larger tables, move to 3.5m minimum. Undersized parasols are the most common planning error — they create a visual impression of shade without the thermal benefit.`,
    },
    expert: "The wind resistance rating of a parasol is not a marketing figure — it is a safety specification. A parasol rated Beaufort 5 (29–38km/h) will fail structurally in a Beaufort 6 gust (39–49km/h) with predictable consequences. For coastal terraces and rooftop venues, always specify Beaufort 6 minimum, with a weighted base of at least 80kg for a 3m parasol.",
    faqs: [
      {
        q: "What parasol diameter is right for my tables?",
        a: `The correct parasol size is determined by the shade coverage radius at peak sun angle (approximately 45° from vertical in summer at European latitudes). A 3m diameter parasol provides effective shade coverage of approximately 5m² at a 45° sun angle — enough to cover one 80×80cm table with four chairs, with a 40–50cm margin on each side. For two adjacent tables sharing one parasol, specify 4m diameter minimum. For a sunbed configuration (beach club or pool deck), one 2.5m cantilever parasol per sunbed pair is standard. Oversizing slightly is always preferable — a 3.5m parasol covering a 3-table cluster creates a clear shade zone and a more intentional aesthetic than three individual 2m parasols.`,
        tip: "Order parasol fabric in a colour with a minimum UPF 50+ rating. Standard acrylic fabric (Sunbrella, Batyline) achieves UPF 40–50+. Lighter colours have lower UPF than dark colours due to weave density.",
        tags: ["Sizing", "Sun protection"],
      },
      {
        q: "What is the difference between a cantilever and a centre-pole parasol for a restaurant terrace?",
        a: `Centre-pole parasols have a central mast passing through the middle of the table — a standard configuration for café and brasserie terraces. They offer superior wind stability (the force is distributed symmetrically), a lower purchase price (20–40% less than equivalent cantilever), and a more traditional aesthetic. The constraint is that the pole occupies the centre of the table, which reduces usable table space and creates a visual obstacle. Cantilever parasols (also called side-arm or offset parasols) mount the mast to the side, leaving the table area completely unobstructed. This is the specification for premium hotel terraces, beach clubs, and pool decks where the visual line must remain clean. The trade-off is higher cost and the need for a substantially heavier base (80–150kg versus 30–60kg for centre-pole) to counterbalance the offset load.`,
        tags: ["Parasol type", "Configuration"],
      },
      {
        q: "What sun lounger specifications are standard for a hotel pool deck?",
        a: `The hotel pool deck standard for sun loungers in European 4-star and above properties is: aluminium or stainless steel frame (rust-proof), adjustable backrest with minimum 5 positions, quick-dry or breathable cushion (Textilene mesh or solution-dyed acrylic), and a weight capacity of minimum 150kg. The cushion specification is critical — closed-cell foam cushions retain water and develop mould within one season; open-cell or quick-dry foam with waterproof cover is the minimum standard. A lounger pitch (centre-to-centre spacing) of 90cm is the accepted minimum for guest comfort on a pool deck; 120cm is preferred for 4-star positioning. Gangway width between rows must be minimum 1.2m for safety access. For beach clubs with sand exposure, avoid cushion piping in light colours — they stain permanently.`,
        tags: ["Loungers", "Pool deck", "Hotel standard"],
      },
      {
        q: "How do I calculate how many parasols I need for a terrace?",
        a: `Start from the number of covers, not the surface. Each parasol should provide shade for 4 covers (standard 2-table configuration) as a baseline. A 32-cover terrace requires 8 parasols at minimum. However, the layout of covers on the terrace determines whether this is achievable — if tables are in rows of 4, two parasols per row works cleanly; if the layout is irregular, you may need 10–12 to avoid shade gaps. A useful rule of thumb: total parasol coverage area (in m²) should equal 1.2× the total table surface area. For a terrace with 8 tables of 70×70cm each, that's 8 × 0.49 × 1.2 = 4.7m² of parasol coverage, achievable with four 3m parasols (7.1m² total, accounting for angle losses).`,
        tags: ["Planning", "Calculation"],
      },
    ],
    cta: { label: "Browse parasols & loungers", href: "/products?category=parasols" },
  },
  {
    id: "layout",
    icon: Ruler,
    label: "Layout & Density",
    subtitle: "Table mix, spacing norms & terrace optimisation",
    color: "#6B7B5E",
    photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80",
    photoAlt: "Restaurant terrace layout overhead view",
    sidebarProducts: SIDEBAR_LAYOUT,
    guide: {
      title: "Terrace layout optimisation: the science of profitable density",
      body: `Layout planning is where hospitality design meets revenue management. The difference between a poorly planned terrace and an optimised one is not aesthetic — it is financial. An extra 8 covers on a 60-seat terrace, achieved through intelligent layout, represents approximately €150–250 of additional revenue per service at typical European CHR average spend. Multiplied across a season, the ROI on professional layout planning is immediate.

The table mix — the ratio of 2-seater to 4-seater to larger tables — is the single most important variable in terrace revenue optimisation. Industry data consistently shows that a balanced mix of 40% 2-seaters, 50% 4-seaters, and 10% larger tables (6–8 covers) matches actual booking patterns most closely for full-service restaurants. Deviating toward exclusively 4-seaters leaves revenue on the table when couples are seated — a 2-person cover at a 4-seat table generates the same revenue as the table is physically capable of while blocking 2 additional potential covers.

The secondary variable is furniture geometry. Square tables (70×70cm or 80×80cm) are more space-efficient than round tables of equivalent capacity. A 70×70cm square table provides 4 covers with a 90cm per-cover access width. A 70cm diameter round table provides only 2 comfortable covers at the same access standard. However, round tables create a more social, animated atmosphere — a relevant consideration for bar terraces and lounge settings.`,
    },
    expert: "When planning table spacing, always model the 'full service' scenario: staff carrying a tray needs 75cm clear passage, a guest pushing back their chair needs 60cm. The most common terrace layout error is planning at empty-room spacing and discovering that once chairs are occupied and guests have bags and jackets around them, the actual circulation collapses.",
    faqs: [
      {
        q: "What is the minimum space per cover on a professional outdoor terrace?",
        a: `The European CHR standard distinguishes three density levels. Economy density (café, quick service): 1.2–1.5m² per cover, chair-back to chair-back spacing of 45–50cm, gangway width 75cm. Standard density (brasserie, casual dining): 1.5–2.0m² per cover, chair-back to chair-back 50–60cm, gangway 90cm. Premium density (restaurant, hotel terrace): 2.0–3.0m² per cover, chair-back to chair-back 70–80cm, gangway 100–120cm. Below 1.2m² per cover, noise levels, privacy perception, and service quality all degrade simultaneously. Local fire safety and accessibility regulations may impose additional minimums — always verify with your local authority before finalising a layout plan.`,
        tip: "Model your layout with chairs occupied, not just tables placed. A guest sitting in a 45cm deep chair adds 50cm to the table footprint on each occupied side.",
        tags: ["Norms", "Density", "CHR standard"],
      },
      {
        q: "What table mix should I use for a 40-cover restaurant terrace?",
        a: `For a 40-cover terrace serving a general restaurant audience (mixed couples, groups of 4, occasional larger tables), the optimised mix is: 6 × 2-seater tables (12 covers, 30%), 7 × 4-seater tables (28 covers, 70%). This provides maximum flexibility: two 2-seaters can be pushed together for a 4, and two 4-seaters for a table of 8. Avoid designing more than 20% of your capacity in fixed large tables (6–8 covers) unless you regularly host group bookings — large tables that sit empty during off-peak services are costly dead space. The table mix should be reviewed seasonally: summer terrace traffic skews toward groups of 4; winter (indoor) traffic skews toward couples.`,
        tags: ["Table mix", "Revenue", "Planning"],
      },
      {
        q: "Should I use square or round tables for my terrace?",
        a: `Square tables (70×70cm or 80×80cm) maximise cover density and are operationally simpler — they align to a grid, can be combined easily, and waste no floor space. Round tables (diameter 60–80cm) create a more social, fluid atmosphere and are preferred for café, wine bar, and lounge settings where the interaction geometry is as important as the cover count. The practical recommendation: use square tables for the main dining area where efficiency matters, and introduce round or oval tables in corner positions or premium zones where atmosphere takes priority. Mixing both in the same terrace works well if the distinction is intentional and visually clear.`,
        tags: ["Table type", "Layout"],
      },
      {
        q: "How do I plan furniture delivery and setup logistics for a large terrace installation?",
        a: `For an installation of 40+ covers, plan the delivery sequence in reverse from setup completion. Confirm site access dimensions first: door widths, elevator capacity if applicable, maximum lorry size that can approach the venue. Most CHR furniture arrives in flat-pack or semi-assembled state; factor 15–20 minutes per chair and 25–30 minutes per table for final assembly. For a 40-cover terrace (chairs + tables), budget 1.5–2 days for a two-person team. Coordinate with your supplier to stagger delivery if storage space is limited — tables and chairs arriving on the same day in a venue with no receiving area creates a bottleneck. Request confirmation of delivery lead times in writing and build a 10-day buffer before your opening date.`,
        tags: ["Logistics", "Installation", "Planning"],
      },
    ],
    cta: { label: "Launch project builder", href: "/projects/new" },
  },
  {
    id: "regulations",
    icon: Scale,
    label: "Regulations & Sourcing",
    subtitle: "CHR norms, certifications, lead times & MOQ",
    color: "#1A2456",
    photo: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=900&q=80",
    photoAlt: "Hotel rooftop terrace at sunset",
    sidebarProducts: SIDEBAR_REGULATIONS,
    guide: {
      title: "Procurement fundamentals for professional outdoor furniture",
      body: `Procuring outdoor furniture for a professional CHR establishment involves regulatory, logistical, and commercial considerations that differ substantially from residential purchasing. Understanding these before engaging suppliers saves time, avoids costly mistakes, and enables better commercial negotiation.

The regulatory framework for CHR outdoor furniture in France and across the EU is anchored in two standards: EN 581 (outdoor seating and tables for camping, domestic and contract use) and EN 12727 (furniture contract seating — strength, durability and safety requirements). EN 12727 Level 4 is the applicable standard for contract furniture in hospitality settings — it specifies load testing, cyclic durability testing, and stability requirements that residential furniture is not required to meet. When sourcing from any supplier, always request the EN 12727 Level 4 test certificate. A supplier unable to provide this document is not supplying to the correct standard.

Fire resistance is a secondary consideration for covered outdoor structures and all indoor-adjacent uses. French fire safety regulation (DDRM and ERP classification) requires furniture in Établissements Recevant du Public (ERP) to meet M2 or M1 fire classification. Upholstered items (cushions, banquettes) require additional certification — British Standard BS 5852 or French NF P 92-507.`,
    },
    expert: "The MOQ (Minimum Order Quantity) conversation is where most procurement errors happen. A supplier quoting a price for 10 units may have a MOQ of 50 for that product in that colour. Always confirm MOQ, lead time, and price break points simultaneously. The price for 48 units is often 15–25% lower than for 12 units — which can offset the cost of carrying stock.",
    faqs: [
      {
        q: "What certifications should outdoor CHR furniture have in France and the EU?",
        a: `The mandatory baseline is EN 12727 Level 4 (contract seating strength and durability) for all chairs and stools. For tables, EN 581-2 (contract use, outdoor) is the applicable standard. Fire resistance for covered outdoor and indoor-adjacent use: fabric and upholstery must meet NF P 92-507 M2 (French standard) or EN 13501-1 Class C equivalent. For hotels and restaurants classified as ERP (Établissement Recevant du Public), all furnishings must comply with local fire safety authority requirements — consult your Commission de Sécurité before procurement if you are uncertain of your ERP category. For sourcing within the EU, CE marking on structural components is required. Products sourced outside the EU (China, Vietnam) must be accompanied by EU-compliant test certificates from an accredited laboratory — manufacturer self-certification is not sufficient.`,
        tip: "Keep a procurement file with all test certificates by product reference. Insurance claims and fire inspection challenges are significantly simplified with this documentation.",
        tags: ["Certification", "EN 12727", "France", "ERP"],
      },
      {
        q: "What is a realistic delivery lead time for outdoor CHR furniture in Europe?",
        a: `Lead times vary significantly by product type and source. European-manufactured aluminium and polypropylene furniture: 4–8 weeks from order confirmation for standard items, 8–14 weeks for custom colours or finishes. Teak furniture from European importers (product sourced from Indonesia or Myanmar but stocked in Europe): 3–6 weeks if in stock, 12–16 weeks if from plantation on order. Products sourced directly from Asian manufacturers without a European warehouse: 14–20 weeks minimum, plus import clearance. For an opening deadline, build a minimum 10-day buffer into your delivery date and confirm in writing with your supplier. Delays are most common at the port clearance and final-mile delivery stage — not in production.`,
        tags: ["Lead time", "Logistics", "Planning"],
      },
      {
        q: "How do I evaluate a furniture supplier I have never worked with?",
        a: `Five questions to ask any new CHR furniture supplier before placing an order: (1) Can you provide EN 12727 Level 4 test certificates for this product? (2) What is your MOQ and price break structure? (3) Do you have CHR references in my country or climate zone I can contact? (4) What is your warranty policy and what does it cover specifically — structural failure, finish, UV fading? (5) Who handles after-sales service and replacement parts in my region? A supplier who hesitates on any of these questions should be treated with caution. In the CHR furniture market, a 3-year structural warranty and 2-year finish warranty are the minimum benchmark for a quality manufacturer.`,
        tip: "Request 1-2 physical samples before placing a large order. Catalogue photos and digital renders do not show finish quality, weight, or flex — all of which determine real-world durability.",
        tags: ["Supplier evaluation", "Due diligence"],
      },
      {
        q: "Can I mix products from different suppliers in one project?",
        a: `Yes, and it is common practice in CHR procurement. Mixing suppliers by product category (one supplier for chairs, another for tables, a third for parasols) is standard for most mid-to-large installations. The risk to manage is visual coherence: chairs and tables that share similar finish tones (all RAL 9005 matte black, for example) read as intentional even when sourced separately. The larger risk is logistical: multiple suppliers mean multiple lead times, multiple minimum order quantities, and multiple points of contact for after-sales. At Terrassea, our sourcing process consolidates these into a single coordinated quote — you see all offers side by side and can confirm multiple suppliers in one submission.`,
        tags: ["Multi-supplier", "Project management"],
      },
      {
        q: "What budget should I plan per cover for a professional outdoor terrace?",
        a: `The furniture budget per cover (chair + share of table cost + share of parasol) varies significantly by product tier. Economy tier (polypropylene chairs, resin tables, basic parasols): €80–120 per cover. Mid-range (aluminium chairs, aluminium or teak tables, quality parasols): €150–250 per cover. Premium (teak or designer aluminium, premium fabrics, cantilever parasols): €300–500 per cover. Luxury (designer pieces, bespoke finishes, custom upholstery): €600+ per cover. These are indicative product costs excluding delivery, installation, and cushions. A 40-cover mid-range terrace should budget €6,000–10,000 for furniture, with an additional 10–15% for logistics and installation. Cushions, if specified, add €20–60 per seat in a CHR-grade waterproof fabric.`,
        tip: "Budget calculation tip: price per cover × 1.15 (logistics and installation) × 1.20 (VAT) = total project cost including tax.",
        tags: ["Budget", "Per cover", "Planning"],
      },
    ],
    cta: { label: "Request a pro service quote", href: "/pro-service" },
  },
];

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-card transition-colors"
          >
            <span className="font-display font-semibold text-sm text-foreground leading-snug">
              {faq.q}
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 mt-1 text-muted-foreground transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{faq.a}</p>
                  {faq.tip && (
                    <div className="bg-accent/50 border border-accent rounded-lg p-4">
                      <span className="text-[11px] font-display font-bold uppercase tracking-wider text-foreground/60">Expert tip</span>
                      <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{faq.tip}</p>
                    </div>
                  )}
                  {faq.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {faq.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-display font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ── Product sidebar card ──────────────────────────────────────────────────────

function SidebarProductCard({ product, color }: { product: SidebarProduct; color: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(product.href)}
      className="group w-full text-left border border-border rounded-sm overflow-hidden hover:border-foreground/30 transition-all"
    >
      <div className="aspect-[4/3] overflow-hidden bg-card group-hover:scale-[1.02] transition-transform duration-500">
        {SIDEBAR_ILLUSTRATIONS[product.name] ? (
          (() => { const Illust = SIDEBAR_ILLUSTRATIONS[product.name]; return <Illust />; })()
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-display font-semibold text-xs text-foreground leading-snug">{product.name}</p>
          <span
            className="text-[9px] font-display font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: color + "18", color }}
          >
            {product.tag}
          </span>
        </div>
        <p className="text-[10px] font-body text-muted-foreground">{product.category}</p>
      </div>
    </button>
  );
}

// ── Topic photo card ──────────────────────────────────────────────────────────

function TopicPhotoCard({ topic, isActive, onClick }: { topic: Topic; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-sm transition-all duration-300 ${
        isActive ? "ring-2 ring-foreground ring-offset-2" : "hover:opacity-90"
      }`}
    >
      {/* Illustration */}
      <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden group-hover:scale-[1.03] transition-transform duration-500">
        {TOPIC_ILLUSTRATIONS[topic.id] ? (
          (() => { const Illust = TOPIC_ILLUSTRATIONS[topic.id]; return <Illust />; })()
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-white" />
      )}

      {/* Icon + label */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center mb-2"
          style={{ backgroundColor: topic.color }}
        >
          <topic.icon className="h-3.5 w-3.5 text-white" />
        </div>
        <p className="font-display font-bold text-sm text-white leading-tight">{topic.label}</p>
        <p className="text-[10px] text-white/60 mt-0.5 leading-tight hidden md:block">{topic.subtitle}</p>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Resources = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState("seating");
  const topic = TOPICS.find(tp => tp.id === activeTopic)!;

  const handleTopicChange = (id: string) => {
    setActiveTopic(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Hero with photo cards ── */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-0">

          {/* Header text */}
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              {t('resources.title')}
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight text-foreground mb-4">
              {t('resources.heroTitle')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t('resources.subtitle')}
            </p>
          </div>

          {/* Photo card grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TOPICS.map(tp => (
              <TopicPhotoCard
                key={tp.id}
                topic={tp}
                isActive={activeTopic === tp.id}
                onClick={() => handleTopicChange(tp.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Topic content — 2-column layout ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12"
          >
            {/* ── Main content column ── */}
            <div>
              {/* Topic header */}
              <div className="flex items-center gap-4 mb-10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: topic.color + "18", color: topic.color }}
                >
                  <topic.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{topic.label}</h2>
                  <p className="text-sm text-muted-foreground">{topic.subtitle}</p>
                </div>
              </div>

              {/* Guide body */}
              <div className="mb-12">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">{topic.guide.title}</h3>
                <div className="space-y-4">
                  {topic.guide.body.trim().split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
                  ))}
                </div>
              </div>

              {/* Expert insight */}
              <div className="bg-foreground text-primary-foreground rounded-lg p-6 mb-12">
                <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-primary-foreground/50 mb-3">
                  {t('resources.expertInsight')}
                </p>
                <p className="text-sm leading-relaxed text-primary-foreground/80 italic">
                  "{topic.expert}"
                </p>
              </div>

              {/* FAQ */}
              <div className="mb-12">
                <h3 className="font-display text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  {t('resources.faqTitle')}
                </h3>
                <FAQAccordion faqs={topic.faqs} />
              </div>

              {/* CTA */}
              <div className="bg-foreground rounded-lg p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-primary-foreground mb-1">
                    {t('resources.readyTitle')}
                  </h3>
                  <p className="text-sm text-primary-foreground/60">
                    {t('resources.readyDesc')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm bg-primary-foreground text-foreground rounded-full hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Start my project <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(topic.cta.href)}
                    className="flex items-center gap-2 px-5 py-2.5 font-display font-semibold text-sm border border-primary-foreground/30 text-primary-foreground/70 rounded-full hover:border-primary-foreground hover:text-primary-foreground transition-all whitespace-nowrap"
                  >
                    {topic.cta.label}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Sidebar ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">

                {/* Sidebar header */}
                <div>
                  <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    {t('resources.relatedProducts')}
                  </p>
                  <div className="space-y-3">
                    {topic.sidebarProducts.map((product, i) => (
                      <SidebarProductCard key={i} product={product} color={topic.color} />
                    ))}
                  </div>
                </div>

                {/* Sidebar CTA */}
                <div
                  className="rounded-sm p-4 border"
                  style={{ borderColor: topic.color + "30", background: topic.color + "08" }}
                >
                  <p className="font-display font-bold text-sm text-foreground mb-1">
                    {t('resources.notSure')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {t('resources.notSureDesc')}
                  </p>
                  <button
                    onClick={() => navigate("/projects/new")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 font-display font-semibold text-xs text-white rounded-full transition-opacity hover:opacity-90"
                    style={{ backgroundColor: topic.color }}
                  >
                    {t('resources.launchMyProject')} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                {/* Topic switcher in sidebar */}
                <div>
                  <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                    {t('resources.otherTopics')}
                  </p>
                  <div className="space-y-1">
                    {TOPICS.filter(tp => tp.id !== activeTopic).map(tp => (
                      <button
                        key={tp.id}
                        onClick={() => handleTopicChange(tp.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left hover:bg-card transition-colors"
                      >
                        <tp.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs font-display font-semibold text-foreground">{tp.label}</p>
                          <p className="text-[10px] text-muted-foreground">{tp.faqs.length} {t('resources.questions')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── Mobile: bottom topic switcher ── */}
      <section className="lg:hidden border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-[11px] font-display font-bold uppercase tracking-[0.2em] text-muted-foreground mb-5">
            {t('resources.continueReading')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map(tp => (
              <button
                key={tp.id}
                onClick={() => handleTopicChange(tp.id)}
                className={`flex flex-col items-start gap-2 p-3 rounded-sm border text-left transition-all ${
                  activeTopic === tp.id ? "border-foreground bg-background" : "border-border hover:border-foreground/30"
                }`}
              >
                <tp.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-display font-semibold text-foreground">{tp.label}</p>
                  <p className="text-[10px] text-muted-foreground">{tp.faqs.length} {t('resources.questions')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Resources;
