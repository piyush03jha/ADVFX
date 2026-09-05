type PriceProps = {
  value: number;
  currency?: string;
  locale?: string;
  size?: "sm" | "md" | "lg";
  prefix?: string;
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl sm:text-3xl",
};

export function Price({
  value,
  currency = "₹",
  locale = "en-IN",
  size = "md",
  prefix,
  className = "",
}: PriceProps) {
  return (
    <div
      className={`
        font-semibold
        tracking-tight
        text-foreground
        ${sizes[size]}
        ${className}
      `}
    >
      {prefix && (
        <span className="mr-1 text-muted">
          {prefix}
        </span>
      )}

      <span>
        {currency}
        {value.toLocaleString(locale)}
      </span>
    </div>
  );
}