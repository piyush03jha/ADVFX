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

export const Navbar = ({ children, className }: NavbarProps) => {
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
        "sticky inset-x-0 top-0 z-40 w-full px-0 sm:px-0 lg:px-0",
        className,
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px)" : "blur(0px)",
        boxShadow: visible ? "0 12px 40px rgba(0,0,0,0.35)" : "none",
        width: visible ? "calc(75% - 48px)" : "calc(80% - 32px)",
        y: visible ? 6 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 32,
        mass: 0.8,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full flex-row items-center justify-between rounded-full border border-border/70 bg-background/70 px-4 py-2 lg:flex",
        visible && "border-border bg-surface/90",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-row items-center justify-center gap-0.5 text-sm font-medium lg:flex",
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          key={`link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative rounded-full px-3.5 py-2 text-muted transition-colors duration-300 hover:text-foreground"
        >
          {hovered === idx && (
            <motion.div
              layoutId="navbar-hover"
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 28,
              }}
              className="absolute inset-0 rounded-full border border-border bg-surface-elevated"
            />
          )}
          <span className="relative z-20 whitespace-nowrap">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px)" : "blur(0px)",
        boxShadow: visible ? "0 12px 40px rgba(0,0,0,0.35)" : "none",
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
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col items-center justify-between rounded-full border border-border/70 bg-background/70 px-2.5 py-2 lg:hidden",
        visible && "border-border bg-surface/90",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children, className }: MobileNavHeaderProps) => {
  return (
    <div className={cn("flex w-full flex-row items-center justify-between", className)}>
      {children}
    </div>
  );
};

export const MobileNavToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
    >
      {isOpen ? <IconX size={19} stroke={1.7} /> : <IconMenu2 size={19} stroke={1.7} />}
    </button>
  );
};

export const MobileNavMenu = ({ children, className, isOpen, onClose }: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className={cn("w-full overflow-hidden", className)}
        >
          <div className="px-1 pb-1 pt-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const NavbarLogo = () => {
  return (
    <Link href="/" className="relative z-20 flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[11px] font-bold tracking-normal text-white shadow-[0_0_18px_var(--glow-primary)]">3D</span>
      <span>BRAND.</span>
    </Link>
  );
};
