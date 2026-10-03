import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function Kitchen({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("kitchen");

  return (
    <CategoryView
      title="Kitchen"
      subtitle="Heavy-duty degreasers and food-safe surface sanitizers that eliminate sticky oil residues, charred grease, and cooking odors."
     
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default Kitchen;