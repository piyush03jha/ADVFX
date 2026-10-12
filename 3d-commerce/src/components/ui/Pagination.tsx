"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  getHref?: (page: number) => string;
}

export function Pagination({ page, totalPages, onChange, getHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageList(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-1.5 sm:mt-14"
    >
      <PageArrow direction="prev" disabled={page === 1} onClick={() => onChange(page - 1)} href={getHref && page > 1 ? getHref(page - 1) : undefined} />

      {/* Phones: a compact counter instead of a scrolling number strip. */}
      <span className="min-w-[7.5rem] text-center text-xs text-muted sm:hidden" aria-live="polite">
        Page <span className="text-foreground">{page}</span> of {totalPages}
      </span>

      <div className="hidden items-center gap-1.5 px-0.5 sm:flex">
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center text-xs text-muted"
            >
              ...
            </span>
          ) : (
            <Control
              key={item}
              href={getHref ? getHref(item) : undefined}
              onActivate={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`
                flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium
                transition-all duration-300
                ${
                  item === page
                    ? "border-primary/50 bg-primary text-white shadow-[0_0_16px_var(--glow-primary)]"
                    : "border-border bg-surface/30 text-muted hover:border-primary/30 hover:text-foreground"
                }
              `}
            >
              {item}
            </Control>
          ),
        )}
      </div>

      <PageArrow
        direction="next"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        href={getHref && page < totalPages ? getHref(page + 1) : undefined}
      />
    </nav>
  );
}

function PageArrow({
  direction,
  disabled,
  onClick,
  href,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  href?: string;
}) {
  return (
    <Control
      href={href}
      disabled={disabled}
      onActivate={onClick}
      aria-label={direction === "prev" ? "Previous page" : "Next page"}
      rel={href ? (direction === "prev" ? "prev" : "next") : undefined}
      className="
        flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border sm:h-9 sm:w-9
        text-muted transition-all duration-300
        hover:border-primary/30 hover:text-foreground
        disabled:pointer-events-none disabled:opacity-30
      "
    >
      {direction === "prev" ? (
        <IconChevronLeft size={15} stroke={1.7} />
      ) : (
        <IconChevronRight size={15} stroke={1.7} />
      )}
    </Control>
  );
}

function Control({
  href,
  disabled,
  onActivate,
  className,
  children,
  ...aria
}: {
  href?: string;
  disabled?: boolean;
  onActivate: () => void;
  className: string;
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page";
  rel?: string;
}) {
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={className}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onActivate();
        }}
        {...aria}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" disabled={disabled} onClick={onActivate} className={className} {...aria}>
      {children}
    </button>
  );
}

function getPageList(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const range: (number | "ellipsis")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("ellipsis");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("ellipsis");
  if (total > 1) range.push(total);

  return range;
}