// ProductSkeleton
export default function ProductSkeleton() {
  return (
    <div className="product-card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-1/3" />
      </div>
    </div>
  );
}
