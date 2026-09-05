import {
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";

type RatingProps = {
  value: number;
  reviewCount?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
};

export function Rating({
  value,
  reviewCount,
  size = 14,
  showValue = true,
  className = "",
}: RatingProps) {
  const safeValue = Math.min(5, Math.max(0, value));

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      aria-label={`${safeValue.toFixed(1)} out of 5 stars${
        reviewCount !== undefined ? `, ${reviewCount} reviews` : ""
      }`}
    >
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => {
          const fill = Math.min(1, Math.max(0, safeValue - index));
          return (
            <span
              key={index}
              className="relative inline-flex shrink-0"
              style={{ width: size, height: size }}
            >
              {/* Empty star (background) */}
              <IconStar
                size={size}
                stroke={1.5}
                className="absolute inset-0 text-muted-foreground/35"
                aria-hidden="true"
              />
              {/* Filled star, clipped to show only the `fill` portion */}
              {fill > 0 && (
                <IconStarFilled
                  size={size}
                  stroke={1.5}
                  className="absolute inset-0 text-warning"
                  style={{
                    clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)`,
                  }}
                  aria-hidden="true"
                />
              )}
            </span>
          );
        })}
      </div>

      {/* Rating value */}
      {showValue && (
        <span className="text-xs font-medium text-foreground">
          {safeValue.toFixed(1)}
        </span>
      )}

      {/* Review count */}
      {reviewCount !== undefined && (
        <span className="text-xs text-muted">({reviewCount})</span>
      )}
    </div>
  );
}