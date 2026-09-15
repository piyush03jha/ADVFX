"use client";

import {
  IconMoon,
  IconSun,
} from "@tabler/icons-react";

import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} mode`}
      onClick={toggleTheme}
      className="relative z-50 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-muted transition-all duration-300 hover:border-primary hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="sr-only">{nextTheme === "dark" ? "Dark mode" : "Light mode"}</span>
      {theme === "dark" ? (
        <IconSun size={18} stroke={1.7} aria-hidden="true" />
      ) : (
        <IconMoon size={18} stroke={1.7} aria-hidden="true" />
      )}
    </button>
  );
}
