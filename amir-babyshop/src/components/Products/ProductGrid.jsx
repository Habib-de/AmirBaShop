import ProductCard from './ProductCard';

export default function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-bold text-amir-dark">No products found</p>
        <p className="text-sm text-amir-dark/60 mt-1">Try adjusting your filters</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-5">
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}