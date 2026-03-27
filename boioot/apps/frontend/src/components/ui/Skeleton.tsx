/**
 * Reusable skeleton primitives.
 * All components rely on the .skeleton CSS class (shimmer animation).
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function SkeletonLine({
  width = "100%",
  height = 14,
}: {
  width?: string | number;
  height?: number;
}) {
  return <Skeleton width={width} height={height} borderRadius={4} />;
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}
