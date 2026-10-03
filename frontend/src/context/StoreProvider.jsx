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
  const [state, setState] = useState({
    status: "loading", // loading | ready | error
    error: "",
    products: [],
    categories: [],
    settings: DEFAULT_SETTINGS,
  });

  // silent = refresh in the background; a failure then keeps showing the data we already have.
  const load = useCallback(async (silent = false) => {
    try {
      const [products, categories, settings] = await Promise.all([
        fetchAllProducts(),
        getCategories(),
        getPublicSettings().catch(() => null), // the store still works with default settings
      ]);
      setState({
        status: "ready",
        error: "",
        products,
        // The website routes categories by slug, so "id" is the slug here.
        categories: categories.data.items.map((c) => ({ ...c, dbId: c.id, id: c.slug })),
        settings: settings ? settings.data.settings : DEFAULT_SETTINGS,
      });
    } catch (err) {
      if (!silent) setState((prev) => ({ ...prev, status: "error", error: err.message }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; state is only set after the network response arrives.
    load();
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
