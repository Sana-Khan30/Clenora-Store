import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function GlassCleaners({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("glass-cleaners");

  return (
    <CategoryView
      title="Glass Cleaners"
      subtitle="Anti-fog and ultra-evaporative streak-free liquids that deliver crystal-clear clarity for mirrors, windows, windshields, and screens."
     
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default GlassCleaners;