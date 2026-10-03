import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function FloorCare({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("floor-care");

  return (
    <CategoryView
      title="Floor Care"
      subtitle="High-performance cleaning solutions for marble, hardwood, and tiled surfaces that leave a long-lasting fresh fragrance and mirror shine."
      
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default FloorCare;