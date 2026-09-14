"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconHeart,
  IconSearch,
  IconShoppingCart,
  IconUserCircle,
} from "@tabler/icons-react";

import {
  Navbar as NavbarRoot,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useCart } from "@/context/CartContext";
import { heroProducts } from "@/config/hero-products";

const navItems = [
  { name: "Home", link: "/" },
  { name: "Shop", link: "/shop" },
  { name: "Custom", link: "/custom" },
  { name: "Gaming", link: "/shop/gaming" },
  { name: "Anime", link: "/shop/anime" },
  { name: "Contact Us", link: "/contact" },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { itemCount, isLoaded } = useCart();

  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query.length < 3) return [];

    return heroProducts
      .filter((product) =>
        [product.name, product.category, product.description].some((value) =>
          value.toLowerCase().includes(query),
        ),
      )
      .slice(0, 5);
  }, [searchQuery]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    window.location.href = `/shop?search=${encodeURIComponent(query)}`;
  };

  return (
    <NavbarRoot>
      <NavBody>
        <NavbarLogo />
        <NavItems items={navItems} />

        <div className="ml-auto flex min-w-0 items-center gap-1 pointer-events-auto">
          <div className="relative hidden lg:block">
            <form
              onSubmit={handleSearchSubmit}
              className="flex w-[190px] items-center rounded-full border border-border bg-surface/80 px-3"
              role="search"
            >
              <IconSearch size={16} stroke={1.8} className="shrink-0 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="h-8 w-full bg-transparent px-2 text-xs text-foreground outline-none placeholder:text-muted focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </form>

            {searchQuery.trim().length >= 3 && (
              <div className="absolute left-0 right-0 top-11 z-[100] overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xl">
                {suggestions.length > 0 ? (
                  suggestions.map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop?search=${encodeURIComponent(product.name)}`}
                      onClick={() => setSearchQuery("")}
                      className="block border-b border-border/60 px-4 py-3 last:border-0 hover:bg-surface"
                    >
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{product.category}</p>
                    </Link>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">No related products found.</p>
                )}
              </div>
            )}
          </div>

          <NavIconLink href="/wishlist" label="Wishlist">
            <IconHeart size={18} stroke={1.7} />
          </NavIconLink>

          <NavIconLink href="/account" label="My account">
            <IconUserCircle size={19} stroke={1.7} />
          </NavIconLink>

          <ThemeToggle />
          <CartLink itemCount={itemCount} isLoaded={isLoaded} />
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <div className="flex items-center gap-1">
            <NavIconLink href="/wishlist" label="Wishlist">
              <IconHeart size={18} stroke={1.7} />
            </NavIconLink>
            <NavIconLink href="/account" label="My account">
              <IconUserCircle size={19} stroke={1.7} />
            </NavIconLink>
            <ThemeToggle />
            <CartLink itemCount={itemCount} isLoaded={isLoaded} />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            />
          </div>
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <div className="relative">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center rounded-xl border border-border bg-surface px-4"
              role="search"
            >
              <IconSearch size={17} stroke={1.8} className="shrink-0 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="h-11 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
              />
            </form>

            {searchQuery.trim().length >= 3 && suggestions.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface-elevated">
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/shop?search=${encodeURIComponent(product.name)}`}
                    onClick={() => {
                      setSearchQuery("");
                      setIsMobileMenuOpen(false);
                    }}
                    className="block border-b border-border/60 px-4 py-3 last:border-0"
                  >
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{product.category}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl border border-transparent px-4 py-3 text-base text-muted transition-all duration-300 hover:border-border hover:bg-surface-elevated hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MobileActionLink
              href="/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <IconHeart size={17} stroke={1.7} />
              <span>Wishlist</span>
            </MobileActionLink>
            <MobileActionLink
              href="/account"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <IconUserCircle size={17} stroke={1.7} />
              <span>Account</span>
            </MobileActionLink>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </NavbarRoot>
  );
}

function NavIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative z-50 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted pointer-events-auto transition-all duration-300 hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </Link>
  );
}

function MobileActionLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm text-muted transition-all duration-300 hover:border-primary hover:bg-surface-elevated hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function CartLink({
  itemCount,
  isLoaded,
}: {
  itemCount: number;
  isLoaded: boolean;
}) {
  return (
    <Link
      href="/cart"
      aria-label={
        itemCount > 0 ? `Shopping cart, ${itemCount} items` : "Shopping cart"
      }
      className="relative z-50 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted pointer-events-auto transition-all duration-300 hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <IconShoppingCart size={18} stroke={1.7} />
      <span
        className={`pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white shadow-[0_0_12px_var(--glow-primary)] transition-all duration-200 ${
          !isLoaded || itemCount === 0
            ? "scale-90 opacity-0"
            : "scale-100 opacity-100"
        }`}
      >
        {itemCount}
      </span>
    </Link>
  );
}
