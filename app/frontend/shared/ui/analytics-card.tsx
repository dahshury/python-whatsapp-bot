"use client";

import { motion } from "framer-motion";
import type * as React from "react";

import { cn } from "@/shared/libs/utils";

// --- PROPS INTERFACE ---
// Defines the shape of data required by the component for type safety and clarity.
export interface AnalyticsCardProps {
  title: string;
  totalAmount: string;
  icon: React.ReactNode;
  data: {
    label: string;
    value: number;
    successValue?: number;
    maxValue?: number; // Optional max value for scaling bars (defaults to 100)
  }[];
  className?: string;
}

/**
 * A responsive and theme-adaptive card for displaying analytics with an animated bar chart.
 * Built with TypeScript, Tailwind CSS, and Framer Motion.
 */
const clampPercent = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};

const getGridColumnsClass = (itemsCount: number) => {
  if (itemsCount >= 4) {
    return "grid-cols-2 sm:grid-cols-4";
  }
  if (itemsCount === 3) {
    return "grid-cols-1 sm:grid-cols-3";
  }
  if (itemsCount === 2) {
    return "grid-cols-1 sm:grid-cols-2";
  }
  return "grid-cols-1";
};

export const AnalyticsCard = ({
  title,
  totalAmount,
  icon,
  data = [],
  className,
  isLocalized = false,
}: AnalyticsCardProps & { isLocalized?: boolean }) => {
  const locale = isLocalized ? "ar-SA" : "en-US";
  return (
    <div
      className={cn(
        "w-full rounded-2xl border bg-card p-6 text-card-foreground shadow-sm",
        className
      )}
    >
      {/* --- CARD HEADER --- */}
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-lg text-muted-foreground">{title}</h3>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
          {icon}
        </div>
      </div>

      {/* --- MAIN VALUE --- */}
      <div className="my-4">
        <h2 className="font-bold text-4xl tracking-tight">{totalAmount}</h2>
      </div>

      {/* --- ANIMATED BAR CHART --- */}
      <div
        aria-label="Analytics chart"
        className={cn("grid gap-4", getGridColumnsClass(data.length || 1))}
      >
        {data.map((item, index) => {
          const maxValue = item.maxValue ?? 100;
          const normalizedValue =
            maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const barHeight = clampPercent(normalizedValue);
          const successValue = item.successValue
            ? clampPercent(item.successValue)
            : 0;
          // Success height is relative to the bar height, not the normalized value
          const successHeight =
            barHeight > 0 && successValue > 0 && maxValue === 100
              ? Math.min(100, (successValue / item.value) * 100)
              : 0;

          // Format display value: if maxValue is 100, show as percentage, otherwise show as number
          const displayValue =
            maxValue === 100
              ? `${item.value.toFixed(0)}%`
              : item.value.toLocaleString(locale);

          return (
            <div
              className="flex flex-col items-center gap-2 text-center"
              key={`${item.label}-${index}`}
            >
              <div
                className="relative flex h-32 w-full items-end overflow-hidden rounded-lg bg-muted/60"
                role="presentation"
              >
                <motion.div
                  animate={{ height: `${barHeight}%` }}
                  aria-label={`${item.label}: ${displayValue}`}
                  aria-valuemax={maxValue}
                  aria-valuemin={0}
                  aria-valuenow={item.value}
                  className="relative w-full rounded-t-md bg-primary/40 p-2"
                  initial={{ height: "0%" }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {successValue > 0 && barHeight > 0 && (
                    <motion.div
                      animate={{ height: `${successHeight}%` }}
                      aria-label={`${item.label} success: ${successValue}%`}
                      className="absolute right-0 bottom-0 left-0 rounded-t-md bg-chart-1 p-2"
                      initial={{ height: "0%" }}
                      transition={{
                        duration: 0.8,
                        delay: index * 0.1 + 0.2,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <span className="-translate-x-1/2 absolute bottom-2 left-1/2 font-semibold text-white text-xs">
                        {successValue.toFixed(0)}%
                      </span>
                    </motion.div>
                  )}
                  <div className="-translate-x-1/2 absolute top-1.5 left-1/2 h-1 w-1/3 rounded-full bg-background/50" />
                  <span className="-translate-x-1/2 absolute bottom-2 left-1/2 font-semibold text-primary-foreground text-xs">
                    {displayValue}
                  </span>
                </motion.div>
              </div>
              <span className="font-medium text-muted-foreground text-sm">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
