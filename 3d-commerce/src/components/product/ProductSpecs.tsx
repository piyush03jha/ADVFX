import type { StorefrontProduct } from "@/lib/catalog-api";

interface ProductSpecsProps {
  product: StorefrontProduct;
}

export function ProductSpecs({
  product,
}: ProductSpecsProps) {
  const specs = [
    { label: "Material", value: product.material ?? "Not specified" },
    { label: "Scale", value: product.scale ?? "Not specified" },
    { label: "Dimensions", value: product.dimensions ?? "Not specified" },
    { label: "Height", value: product.height ?? "Not specified" },
    { label: "Base", value: product.base ?? "Not specified" },
    { label: "Packaging", value: product.packaging ?? "Not specified" },
    { label: "Weight", value: product.weight ?? "Not specified" },
  ];

  return (
    <div>
      <div>
        <p
          className="
            text-[9px]
            font-medium
            uppercase
            tracking-[0.2em]
            text-primary
          "
        >
          Technical information
        </p>

        <h2
          className="
            mt-2
            font-serif
            text-2xl
            tracking-[-0.035em]
            text-foreground
            sm:text-3xl
          "
        >
          Product specifications
        </h2>
      </div>

      <div
        className="
          mt-7
          overflow-hidden
          border-y
          border-white/[0.07]
        "
      >
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="
              grid
              grid-cols-[100px_minmax(0,1fr)]
              items-center
              gap-5
              border-b
              border-white/[0.07]
              py-4
              last:border-b-0
              sm:grid-cols-[140px_minmax(0,1fr)]
              sm:py-5
            "
          >
            <p
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-[0.16em]
                text-muted
              "
            >
              {spec.label}
            </p>

            <p
              className="
                text-right
                text-sm
                font-medium
                text-foreground
                sm:text-[15px]
              "
            >
              {spec.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}