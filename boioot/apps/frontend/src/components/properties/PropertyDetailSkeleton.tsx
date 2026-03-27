import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

/**
 * Full-page skeleton for the property detail / project detail loading state.
 * Mirrors the hero image + info panel layout.
 */
export function PropertyDetailSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      {/* Hero image */}
      <Skeleton width="100%" height={360} borderRadius={12} style={{ marginBottom: "1.5rem" }} />

      {/* Title */}
      <SkeletonLine width="70%" height={28} />
      <div style={{ marginTop: "0.75rem" }}>
        <SkeletonLine width="40%" height={22} />
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <Skeleton width={72} height={26} borderRadius={12} />
        <Skeleton width={60} height={26} borderRadius={12} />
        <Skeleton width={80} height={26} borderRadius={12} />
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1.5rem" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <SkeletonLine width="35%" height={12} />
            <SkeletonLine width="55%" height={12} />
          </div>
        ))}
      </div>

      {/* Description block */}
      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <SkeletonLine width="100%" height={12} />
        <SkeletonLine width="95%" height={12} />
        <SkeletonLine width="88%" height={12} />
        <SkeletonLine width="60%" height={12} />
      </div>
    </div>
  );
}
