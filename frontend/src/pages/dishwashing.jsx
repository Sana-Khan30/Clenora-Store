import CategoryView from "../components/CategoryView";
import { useStore } from "../context/storeContext";

function Dishwashing({ addToCart, wishlist, toggleWishlist }) {
  const { getProductsByCategory } = useStore();
  const products = getProductsByCategory("dishwashing");

  return (
    <CategoryView
      title="Dishwashing"
      subtitle="High-foaming grease-cutting formulas and plant-powered dishwasher pods that cut grease on contact without drying your hands."
      products={products}
      addToCart={addToCart}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
    />
  );
}

export default Dishwashing;