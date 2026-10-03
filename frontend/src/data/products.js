// Centralized CLEANY Product Catalog
// All prices in PKR (Rs.)

export const CATEGORIES = [
  {
    id: "floor-care",
    name: "Floor Care",
    description: "Keep your hardwood, marble, and tile floors spotless and fragrant.",
  },
  {
    id: "bathroom",
    name: "Bathroom",
    description: "Powerful limescale, soap scum, and tile cleaners for sparkling freshness.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Cut grease, grime, and food residue on countertops, stoves, and ovens.",
  },
  {
    id: "laundry",
    name: "Laundry",
    description: "Enzyme-boosted liquid detergents and fabric softeners for crisp clothes.",
  },
  {
    id: "glass-cleaners",
    name: "Glass Cleaners",
    description: "Crystal-clear, anti-fog, and streak-free formulas for mirrors and windows.",
  },
  {
    id: "dishwashing",
    name: "Dishwashing",
    description: "Tough on grease, gentle on hands with fast-rinse foam technology.",
  },
];

export const PRODUCTS = [
  // =========================
  // FLOOR CARE (4 products)
  // =========================
  {
    id: 101,
    name: "Fresh Citrus Floor Cleaner",
    category: "Floor Care",
    categorySlug: "floor-care",
    price: 850,
    oldPrice: 1050,
    rating: 4.8,
    reviews: 142,
    badge: "Popular",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    description: "Triple-action lemon floor disinfectant that leaves high gloss shine with zero sticky residue.",
  },
  {
    id: 102,
    name: "Marble & Granite Luxe Polish",
    category: "Floor Care",
    categorySlug: "floor-care",
    price: 980,
    oldPrice: 1200,
    rating: 4.9,
    reviews: 98,
    badge: "Premium",
    featured: true,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
    description: "pH-neutral natural stone formula designed to preserve sealant and bring out natural marble veins.",
  },
  {
    id: 103,
    name: "Hardwood Floor Conditioner",
    category: "Floor Care",
    categorySlug: "floor-care",
    price: 1100,
    oldPrice: 1350,
    rating: 4.7,
    reviews: 64,
    badge: "Eco-Safe",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80",
    description: "Enriched with organic plant waxes to nourish wood grains and prevent water swelling.",
  },
  {
    id: 104,
    name: "Tile & Grout Deep Sanitizer",
    category: "Floor Care",
    categorySlug: "floor-care",
    price: 680,
    oldPrice: 800,
    rating: 4.6,
    reviews: 82,
    badge: "Fast Action",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80",
    description: "Penetrates porous grout lines to lift trapped dirt, mold spots, and everyday grime easily.",
  },

  // =========================
  // BATHROOM (4 products)
  // =========================
  {
    id: 201,
    name: "Power Foam Bathroom Cleaner",
    category: "Bathroom",
    categorySlug: "bathroom",
    price: 780,
    oldPrice: 920,
    rating: 4.9,
    reviews: 215,
    badge: "Best Seller",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    description: "Active expanding foam dissolves soap scum, hard water stains, and yellow ceramic buildup.",
  },
  {
    id: 202,
    name: "Ultra Descaling Toilet Gel",
    category: "Bathroom",
    categorySlug: "bathroom",
    price: 490,
    oldPrice: 580,
    rating: 4.8,
    reviews: 174,
    badge: "Antibacterial",
    featured: false,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
    description: "Curved-neck bottle coats under the rim with thick clinging gel that eradicates 99.9% of bacteria.",
  },
  {
    id: 203,
    name: "Shower Glass & Tile Protector",
    category: "Bathroom",
    categorySlug: "bathroom",
    price: 850,
    oldPrice: 990,
    rating: 4.7,
    reviews: 91,
    badge: "Hydrophobic",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=600&q=80",
    description: "Creates an invisible water-repellent barrier preventing future hard water spotting for up to 30 days.",
  },
  {
    id: 204,
    name: "Mold & Mildew Blaster Spray",
    category: "Bathroom",
    categorySlug: "bathroom",
    price: 640,
    oldPrice: 750,
    rating: 4.6,
    reviews: 58,
    badge: "No Scrub",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=600&q=80",
    description: "Targeted nozzle spray penetrates damp shower seals and silicone seams to bleach dark mildew spots.",
  },

  // =========================
  // KITCHEN (4 products)
  // =========================
  {
    id: 301,
    name: "Heavy-Duty Kitchen Degreaser",
    category: "Kitchen",
    categorySlug: "kitchen",
    price: 720,
    oldPrice: 850,
    rating: 4.9,
    reviews: 188,
    badge: "High Power",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
    description: "Dissolves baked-on oils and greasy cooking film on range hoods, fryers, and backsplash tiles.",
  },
  {
    id: 302,
    name: "Multi-Surface Kitchen Spray",
    category: "Kitchen",
    categorySlug: "kitchen",
    price: 550,
    oldPrice: 650,
    rating: 4.7,
    reviews: 112,
    badge: "Food Safe",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80",
    description: "Plant-based daily surface sanitizer safe for dining tables, countertops, and cutting boards.",
  },
  {
    id: 303,
    name: "Stainless Steel Shiner Spray",
    category: "Kitchen",
    categorySlug: "kitchen",
    price: 890,
    oldPrice: 1050,
    rating: 4.8,
    reviews: 76,
    badge: "Fingerprint Free",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80",
    description: "Restores factory shine on refrigerators, microwaves, and sinks with micro-protective silicone coat.",
  },
  {
    id: 304,
    name: "Ceramic Cooktop & Oven Paste",
    category: "Kitchen",
    categorySlug: "kitchen",
    price: 670,
    oldPrice: 790,
    rating: 4.6,
    reviews: 63,
    badge: "Non-Scratch",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
    description: "Gentle mineral paste cuts through scorched spillages on glass hobs without scratching.",
  },

  // =========================
  // LAUNDRY (4 products)
  // =========================
  {
    id: 401,
    name: "Fresh Bloom Laundry Liquid",
    category: "Laundry",
    categorySlug: "laundry",
    price: 1250,
    oldPrice: 1450,
    rating: 4.8,
    reviews: 230,
    badge: "Best Seller",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
    description: "Concentrated 3x bio-enzyme formulation that cleans whites and colors in both cold and hot cycles.",
  },
  {
    id: 402,
    name: "Silk & Wool Softening Rinse",
    category: "Laundry",
    categorySlug: "laundry",
    price: 920,
    oldPrice: 1080,
    rating: 4.7,
    reviews: 84,
    badge: "Sensitive Skin",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
    description: "Dermatologically tested fabric conditioner that eliminates static cling and softens delicate fibers.",
  },
  {
    id: 403,
    name: "Oxygen Stain Remover Powder",
    category: "Laundry",
    categorySlug: "laundry",
    price: 790,
    oldPrice: 950,
    rating: 4.9,
    reviews: 160,
    badge: "Color Safe",
    featured: true,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    description: "Active oxygen micro-bubbles lift tea, coffee, grass, and grease stains without harsh chlorine bleach.",
  },
  {
    id: 404,
    name: "Anti-Bacterial Laundry Booster",
    category: "Laundry",
    categorySlug: "laundry",
    price: 860,
    oldPrice: 1000,
    rating: 4.7,
    reviews: 67,
    badge: "Odor Neutralizer",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80",
    description: "Eliminates deep sportswear perspiration odors and sanitizes gym towels and bedding.",
  },

  // =========================
  // GLASS CLEANERS (4 products)
  // =========================
  {
    id: 501,
    name: "Sparkle Streak-Free Glass Spray",
    category: "Glass Cleaners",
    categorySlug: "glass-cleaners",
    price: 650,
    oldPrice: 790,
    rating: 4.8,
    reviews: 194,
    badge: "Fast Evaporate",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    description: "Ammonia-free clear glass cleaner that dries in seconds leaving brilliant transparency without haze.",
  },
  {
    id: 502,
    name: "Anti-Fog Mirror & Glass Fluid",
    category: "Glass Cleaners",
    categorySlug: "glass-cleaners",
    price: 740,
    oldPrice: 890,
    rating: 4.7,
    reviews: 89,
    badge: "Anti-Steam",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=600&q=80",
    description: "Specialized formulation that prevents steam fogging on bathroom mirrors and windshields.",
  },
  {
    id: 503,
    name: "Window Exterior Rain Repel",
    category: "Glass Cleaners",
    categorySlug: "glass-cleaners",
    price: 890,
    oldPrice: 1100,
    rating: 4.9,
    reviews: 104,
    badge: "All Weather",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    description: "Hydrophobic exterior window solution causes raindrops to bead off, keeping outdoor glass clean longer.",
  },
  {
    id: 504,
    name: "Tech Screen & Lens Cleaner",
    category: "Glass Cleaners",
    categorySlug: "glass-cleaners",
    price: 520,
    oldPrice: 620,
    rating: 4.6,
    reviews: 73,
    badge: "Alcohol-Free",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
    description: "Ultra-gentle formulation with static-resistant shield for OLED TVs, laptops, smartphones, and eyewear.",
  },

  // =========================
  // DISHWASHING (4 products)
  // =========================
  {
    id: 601,
    name: "Citrus Burst Dishwashing Gel",
    category: "Dishwashing",
    categorySlug: "dishwashing",
    price: 450,
    oldPrice: 550,
    rating: 4.9,
    reviews: 280,
    badge: "Top Rated",
    featured: true,
    bestSeller: true,
    inStock: true,
    image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80",
    description: "Ultra-concentrated liquid with natural lemon zest extracts that strips thick grease in 1 drop.",
  },
  {
    id: 602,
    name: "Eco Clean Dishwasher Tablets (30pk)",
    category: "Dishwashing",
    categorySlug: "dishwashing",
    price: 1350,
    oldPrice: 1600,
    rating: 4.8,
    reviews: 147,
    badge: "All-in-1",
    featured: true,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
    description: "Water-soluble pods with built-in salt and rinse-aid for spot-free silverware and sparkling glassware.",
  },
  {
    id: 603,
    name: "Baby Bottle & Dish Foam Wash",
    category: "Dishwashing",
    categorySlug: "dishwashing",
    price: 680,
    oldPrice: 790,
    rating: 4.9,
    reviews: 95,
    badge: "100% Organic",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80",
    description: "Hypoallergenic, fragrance-free foaming pump soap safely rinses away milk film and baby food residues.",
  },
  {
    id: 604,
    name: "Sparkling Glass Rinse Aid",
    category: "Dishwashing",
    categorySlug: "dishwashing",
    price: 590,
    oldPrice: 700,
    rating: 4.7,
    reviews: 62,
    badge: "Zero Watermarks",
    featured: false,
    bestSeller: false,
    inStock: true,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
    description: "Dishwasher accelerator that speeds drying and stops calcium deposit cloudiness on wine glasses.",
  },
];

// Helper functions for easy querying
export function getAllProducts() {
  return PRODUCTS;
}

export function getProductById(id) {
  return PRODUCTS.find((p) => p.id === Number(id));
}

export function getProductsByCategory(categoryNameOrSlug) {
  const query = categoryNameOrSlug.toLowerCase().replace(/-/g, " ");
  return PRODUCTS.filter(
    (p) =>
      p.category.toLowerCase() === query ||
      p.categorySlug === categoryNameOrSlug.toLowerCase()
  );
}

export function getFeaturedProducts() {
  return PRODUCTS.filter((p) => p.featured);
}

export function getBestSellers() {
  return PRODUCTS.filter((p) => p.bestSeller);
}

export function searchProducts(query) {
  if (!query || typeof query !== "string") return PRODUCTS;
  const q = query.trim().toLowerCase();
  if (!q) return PRODUCTS;

  return PRODUCTS.filter((p) => {
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });
}
