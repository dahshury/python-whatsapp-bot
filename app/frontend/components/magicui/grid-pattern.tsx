"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface GridPatternProps {
  className?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number | string;
  strokeWidth?: number;
}

export function GridPattern({
  className,
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  strokeWidth = 1,
}: GridPatternProps) {
  const reactId = useId().replace(/[:]/g, "");
  const patternId = `grid-pattern-${reactId}`;
  const dash = typeof strokeDasharray === "number" ? `${strokeDasharray}` : strokeDasharray;

  return (
    <svg
      aria-hidden
      className={cn("h-full w-full", className)}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={patternId}
          x={x}
          y={y}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${width} 0 L 0 0 0 ${height}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={dash}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export type { GridPatternProps };


