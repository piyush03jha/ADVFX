"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import React, { useRef, useState } from "react";

/* =========================================================
   TYPES
========================================================= */

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

/* =========================================================
   NAVBAR
========================================================= */

export const Navbar = ({
  children,
  className,
}: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 100);
  });

  return (
    <motion.div
      ref={ref}
      className={cn(
        `
        sticky
        inset-x-0
        top-4
        z-40
        w-full
        px-2
        sm:px-3
        lg:px-4
        `,
        className,
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{
                visible?: boolean;
              }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

/* =========================================================
   DESKTOP NAV BODY
========================================================= */

export const NavBody = ({
  children,
  className,
  visible,
}: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible
          ? "blur(20px)"
          : "blur(0px)",

        boxShadow: visible
          ? "0 12px 40px rgba(0,0,0,0.35)"
          : "none",

        /*
         * Desktop navbar:
         * - Initial: almost full width
         * - Scrolled: slightly narrower
         *
         * No max-width constraint so the navbar
         * actually responds to the viewport width.
         */
        width: visible
          ? "calc(75% - 48px)"
          : "calc(80% - 32px)",

        y: visible ? 6 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 32,
        mass: 0.8,
      }}
      className={cn(
        `
        relative
        z-[60]
        mx-auto
        hidden
        w-full
        flex-row
        items-center
        justify-between
        rounded-full
        border
        border-border/70
        bg-background/70
        px-4
        py-2
        lg:flex
        `,
        visible &&
          `
          border-border
          bg-surface/90
          `,
        className,
      )}
    >
      {children}
    </motion.div>
  );
};
/* =========================================================
   DESKTOP NAV ITEMS
========================================================= */

export const NavItems = ({
  items,
  className,
  onItemClick,
}: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(
    null,
  );

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        `
        absolute
        inset-0
        hidden
        flex-row
        items-center
        justify-center
        gap-0.5
        text-sm
        font-medium
        lg:flex
        `,
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          key={`link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="
            relative
            rounded-full
            px-3.5
            py-2
            text-muted
            transition-colors
            duration-300
            hover:text-foreground
          "
        >
          {hovered === idx && (
            <motion.div
              layoutId="navbar-hover"
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 28,
              }}
              className="
                absolute
                inset-0
                rounded-full
                border
                border-border
                bg-surface-elevated
              "
            />
          )}

          <span className="relative z-20 whitespace-nowrap">
            {item.name}
          </span>
        </Link>
      ))}
    </motion.div>
  );
};

/* =========================================================
   MOBILE NAV
========================================================= */

export const MobileNav = ({
  children,
  className,
  visible,
}: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible
          ? "blur(20px)"
          : "blur(0px)",

        boxShadow: visible
          ? "0 12px 40px rgba(0,0,0,0.35)"
          : "none",

        width: visible ? "96%" : "100%",

        y: visible ? 6 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 32,
        mass: 0.8,
      }}
      className={cn(
        `
        relative
        z-50
        mx-auto
        flex
        w-full
        max-w-[calc(100vw-1rem)]
        flex-col
        items-center
        justify-between
        rounded-full
        border
        border-border/70
        bg-background/70
        px-2.5
        py-2
        lg:hidden
        `,
        visible &&
          `
          border-border
          bg-surface/90
          `,
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================
   MOBILE HEADER
========================================================= */

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

/* =========================================================
   MOBILE MENU
========================================================= */

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{
            opacity: 0,
            height: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            height: "auto",
            y: 0,
          }}
          exit={{
            opacity: 0,
            height: 0,
            y: -10,
          }}
          transition={{
            duration: 0.3,
          }}
          className={cn(
            `
            absolute
            inset-x-0
            top-[calc(100%+0.5rem)]
            z-50
            flex
            w-full
            flex-col
            items-start
            justify-start
            gap-4
            overflow-hidden
            rounded-3xl
            border
            border-border
            bg-surface/95
            px-3
            py-5
            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            backdrop-blur-xl
            `,
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* =========================================================
   MOBILE TOGGLE
========================================================= */

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={
        isOpen
          ? "Close navigation"
          : "Open navigation"
      }
      aria-expanded={isOpen}
      onClick={onClick}
      className="
        flex
        h-9
        w-9
        shrink-0
        items-center
        justify-center
        rounded-full
        text-muted
        transition-all
        duration-300
        hover:bg-surface-elevated
        hover:text-foreground
        focus-visible:ring-2
        focus-visible:ring-primary
      "
    >
      {isOpen ? (
        <IconX size={20} stroke={1.7} />
      ) : (
        <IconMenu2 size={20} stroke={1.7} />
      )}
    </button>
  );
};

/* =========================================================
   LOGO
========================================================= */

export const NavbarLogo = () => {
  return (
    <Link
      href="/"
      className="
        relative
        z-20
        flex
        shrink-0
        items-center
        gap-2
        px-2
        py-1
        text-sm
        font-semibold
        tracking-[0.15em]
        text-foreground
        transition-opacity
        hover:opacity-80
      "
    >
      <span
        className="
          flex
          h-7
          w-7
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-[image:var(--gradient-primary)]
          text-xs
          font-bold
          text-white
          shadow-[0_0_18px_var(--glow-primary)]
        "
      >
        3D
      </span>

      <span className="whitespace-nowrap">
        BRAND<span className="text-primary">.</span>
      </span>
    </Link>
  );
};

/* =========================================================
   NAVBAR BUTTON
========================================================= */

export const NavbarButton = ({
  href,
  children,
  className,
  variant = "primary",
  type = "button",
  target,
  rel,
  onClick,
}: NavbarButtonProps) => {
  const baseStyles = `
    relative
    inline-flex
    items-center
    justify-center
    rounded-full
    px-5
    py-2.5
    text-sm
    font-medium
    transition-all
    duration-300
    hover:-translate-y-0.5
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-primary
  `;

  const variantStyles = {
    primary: `
      bg-[image:var(--gradient-primary)]
      text-white
      shadow-[0_8px_30px_rgba(139,92,246,0.25)]
      hover:shadow-[0_10px_40px_rgba(139,92,246,0.4)]
    `,

    secondary: `
      border
      border-border
      bg-surface
      text-foreground
      hover:border-primary
      hover:bg-surface-elevated
    `,

    dark: `
      border
      border-border
      bg-background
      text-foreground
      hover:border-primary
      hover:bg-surface
    `,

    gradient: `
      bg-[image:var(--gradient-primary)]
      text-white
      shadow-[0_8px_30px_rgba(139,92,246,0.25)]
      hover:shadow-[0_10px_40px_rgba(139,92,246,0.4)]
    `,
  };

  const classes = cn(
    baseStyles,
    variantStyles[variant],
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        onClick={
          onClick as
            | React.MouseEventHandler<HTMLAnchorElement>
            | undefined
        }
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={
        onClick as
          | React.MouseEventHandler<HTMLButtonElement>
          | undefined
      }
    >
      {children}
    </button>
  );
};

interface NavbarButtonProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  variant?:
    | "primary"
    | "secondary"
    | "dark"
    | "gradient";
  type?: "button" | "submit" | "reset";
  target?: string;
  rel?: string;
  onClick?:
    | React.MouseEventHandler<HTMLAnchorElement>
    | React.MouseEventHandler<HTMLButtonElement>;
}