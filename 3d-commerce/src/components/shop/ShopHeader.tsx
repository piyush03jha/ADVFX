"use client";

/**
 * Reserves vertical space for the fixed navbar so the shop category
 * navigation begins clearly below it instead of being overlapped.
 */
export function ShopHeader() {
  return <div aria-hidden="true" className="h-28 sm:h-32 lg:h-36" />;
}
