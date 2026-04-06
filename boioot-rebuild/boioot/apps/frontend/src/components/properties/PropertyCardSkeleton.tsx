import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Skeleton that matches the PropertyCard layout pixel-for-pixel.
 * Used while properties are loading to prevent layout shift.
 */
export function PropertyCardSkeleton() {
  return (
    <div className="card property-card" aria-hidden="true" style={{ overflow: "hidden" }}>
      {/* Image area */}
      <Skeleton width="100%" height={200} borderRadius={0} />

      {/* Body */}
      <div className="property-card__body">
        {/* Title — 2 lines */}
        <SkeletonLine width="90%" height={16} />
        <SkeletonLine width="65%" height={16} />

        {/* Price */}
        <SkeletonLine width="45%" height={20} />

        {/* City */}
        <SkeletonLine width="35%" height={12} />

        {/* Tags row */}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", paddingTop: "0.5rem" }}>
          <Skeleton width={56} height={22} borderRadius={12} />
          <Skeleton width={44} height={22} borderRadius={12} />
          <Skeleton width={52} height={22} borderRadius={12} />
        </div>
      </div>
    </div>
  );
}

/**
 * A grid of PropertyCardSkeletons — replaces the spinner while loading a card list.
 */
export function PropertyCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid-cards">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
