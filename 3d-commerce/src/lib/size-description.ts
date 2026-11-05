import type { StorefrontVariant } from "./catalog-api";

/**
 * Product description for the selected size.
 *
 * - `{size}` / `{sizeName}` in the admin-written description are replaced.
 * - Otherwise a short size sentence is added so the text changes with the size.
 */
export function describeForSize(
  description: string,
  variant: Pick<StorefrontVariant, "name" | "size"> | null,
): string {
  const text = (description ?? "").trim();
  if (!variant) return text;

  const size = variant.size?.trim() || variant.name;
  const name = variant.name;

  if (/\{size(Name)?\}/i.test(text)) {
    return text.replace(/\{sizeName\}/gi, name).replace(/\{size\}/gi, size);
  }

  const sentence =
    variant.size?.trim() && variant.size.trim().toLowerCase() !== name.toLowerCase()
      ? `Shown in the ${name} size (${variant.size.trim()}), 3D printed to order.`
      : `Shown in the ${name} size, 3D printed to order.`;

  return text ? `${text} ${sentence}` : sentence;
}
