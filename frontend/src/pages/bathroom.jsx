import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function Bathroom({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("bathroom");

  return (
    <CategoryView
      title="Bathroom"
      subtitle="Hospital-grade disinfection formulas engineered to dissolve soap scum, yellow limescale, and stubborn grout stains effortlessly."
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default Bathroom;