"use client";

/**
 * Reserves only the necessary vertical space for the fixed navbar
 * so the shop controls sit closer to the navigation without overlap.
 */
export function ShopHeader() {
  return <div aria-hidden="true" className="h-16 sm:h-20 lg:h-24" />;
}
