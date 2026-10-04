"use client";

interface ProductListThumbnailProps {
  model: string;
  image?: string;
  alt?: string;
}

export function ProductListThumbnail({
  image,
  alt = "Product",
}: ProductListThumbnailProps) {
  return (
    <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-elevated">
      {image ? (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[9px] text-muted">
          —
        </div>
      )}
    </div>
  );
}
