import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreContext } from "./storeContext";
import { getCategories, getProducts, getPublicSettings } from "../api/endpoints";

const DEFAULT_SETTINGS = {
  storeName: "CLENORA",
  whatsappNumber: "",
  whatsappLink: null,
  shippingFee: 150,
  freeShippingThreshold: 1500,
};

const DEFAULT_CATEGORIES = [
  { id: "floor-care", slug: "floor-care", name: "Floor Care", description: "Shine & protection for marble, tile, wood and vinyl", icon: "✨" },
  { id: "bathroom", slug: "bathroom", name: "Bathroom", description: "Limescale & soap scum removal for sparkling fittings", icon: "🛁" },
  { id: "kitchen", slug: "kitchen", name: "Kitchen", description: "Heavy-duty degreasers for hobs, hoods, and counters", icon: "🍳" },
  { id: "laundry", slug: "laundry", name: "Laundry", description: "Deep fabric hygiene and long-lasting freshness", icon: "🧺" },
  { id: "glass-cleaners", slug: "glass-cleaners", name: "Glass Cleaners", description: "Streak-free clarity for windows, mirrors, and glass", icon: "🪟" },
  { id: "dishwashing", slug: "dishwashing", name: "Dishwashing", description: "Tough on grease, gentle on hands with skin-safe enzymes", icon: "🍽️" },
];

const CACHE_KEY = "clenora_store_catalog_v2";

function loadCachedCatalog() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

// The API caps a page at 100 products, so keep asking until every page is loaded.
async function fetchAllProducts() {
  let page = 1;
  let all = [];
  for (;;) {
    const res = await getProducts({ page, limit: 100 });
    all = all.concat(res.data.items);
    if (page >= res.meta.totalPages || page >= 50) break;
    page += 1;
  }
  return all;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => {
    const cached = loadCachedCatalog();
    if (cached) {
      return {
        status: "ready",
        error: "",
        products: cached.products || [],
        categories: cached.categories && cached.categories.length > 0 ? cached.categories : DEFAULT_CATEGORIES,
        settings: cached.settings || DEFAULT_SETTINGS,
      };
    }
    return {
      status: "loading", // loading | ready | error
      error: "",
      products: [],
      categories: DEFAULT_CATEGORIES,
      settings: DEFAULT_SETTINGS,
    };
  });

  // silent = refresh in the background; a failure then keeps showing the data we already have.
  const load = useCallback(async (silent = false) => {
    try {
      const [products, categories, settings] = await Promise.all([
        fetchAllProducts(),
        getCategories(),
        getPublicSettings().catch(() => null), // the store still works with default settings
      ]);
      const formattedCategories = categories.data.items.map((c) => ({ ...c, dbId: c.id, id: c.slug }));
      const resolvedSettings = settings ? settings.data.settings : DEFAULT_SETTINGS;

      setState({
        status: "ready",
        error: "",
        products,
        categories: formattedCategories.length > 0 ? formattedCategories : DEFAULT_CATEGORIES,
        settings: resolvedSettings,
      });

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            products,
            categories: formattedCategories,
            settings: resolvedSettings,
            updatedAt: Date.now(),
          })
        );
      } catch {
        // ignore quota error
      }
    } catch (err) {
      if (!silent) setState((prev) => ({ ...prev, status: "error", error: err.message }));
    }
  }, []);

  useEffect(() => {
    // If cached products exist, revalidate silently so user sees 0ms load delay!
    const hasCache = state.products && state.products.length > 0;
    load(hasCache);
  }, [load]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: "loading", error: "" }));
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const value = useMemo(() => {
    const { products } = state;
    return {
      ...state,
      retry,
      refresh,
      getAllProducts: () => products,
      getProductById: (id) => products.find((p) => p.id === String(id)),
      getProductsByCategory: (slugOrName) => {
        const key = String(slugOrName).toLowerCase();
        return products.filter((p) => p.categorySlug === key || p.category.toLowerCase() === key.replace(/-/g, " "));
      },
      getFeaturedProducts: () => products.filter((p) => p.featured),
      getBestSellers: () => products.filter((p) => p.bestSeller),
    };
  }, [state, retry, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
