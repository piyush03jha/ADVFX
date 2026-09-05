import {
  IconCheck,
  IconCircle,
  IconMapPin,
} from "@tabler/icons-react";

import type { TrackingEvent } from "@/config/orders";

interface OrderTimelineProps {
  events: TrackingEvent[];
  compact?: boolean;
}

export function OrderTimeline({
  events,
  compact = false,
}: OrderTimelineProps) {
  return (
    <div className="relative">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <div
            key={`${event.status}-${index}`}
            className={`relative flex gap-3 ${isLast ? "" : "pb-4"} sm:gap-4 sm:pb-5`}
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-px sm:left-[9px] sm:top-5 ${
                  event.completed
                    ? "bg-primary/55"
                    : "bg-border"
                }`}
              />
            )}

            <div
              className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full sm:h-5 sm:w-5 ${
                event.current
                  ? "bg-primary text-white shadow-[0_0_18px_var(--glow-primary)]"
                  : event.completed
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-muted"
              }`}
            >
              {event.completed ? (
                <IconCheck size={10} stroke={2.5} />
              ) : (
                <IconCircle size={7} fill="currentColor" />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-0.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium leading-5 sm:text-base ${
                      event.current
                        ? "text-primary"
                        : event.completed
                          ? "text-foreground"
                          : "text-muted"
                    }`}
                  >
                    {event.title}
                  </p>

                  {!compact && (
                    <p className="mt-1 max-w-xl text-xs leading-5 text-muted sm:text-sm">
                      {event.description}
                    </p>
                  )}

                  {event.location && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-muted sm:text-[10px]">
                      <IconMapPin size={11} stroke={1.6} />
                      {event.location}
                    </p>
                  )}
                </div>

                {event.timestamp && (
                  <span className="shrink-0 whitespace-nowrap text-[9px] leading-4 text-muted sm:text-xs sm:leading-5">
                    {event.timestamp}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
