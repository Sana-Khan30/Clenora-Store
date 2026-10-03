import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function Laundry({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("laundry");

  return (
    <CategoryView
      title="Laundry"
      subtitle="Enzyme-charged detergent liquids and gentle botanical fabric softeners that brighten colors, protect fabrics, and leave a soothing scent."
      
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default Laundry;