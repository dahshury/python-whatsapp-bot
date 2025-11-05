"use client";

import { cn } from "@shared/libs/utils";
import { useId } from "react";

type GridPatternProps = {
  className?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number | string;
  strokeWidth?: number;
};

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
  const dash =
    typeof strokeDasharray === "number"
      ? `${strokeDasharray}`
      : strokeDasharray;

  return (
    <svg
      aria-hidden
      className={cn("h-full w-full", className)}
      height="100%"
      width="100%"
    >
      <title>Grid pattern background</title>
      <defs>
        <pattern
          height={height}
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={width}
          x={x}
          y={y}
        >
          <path
            d={`M ${width} 0 L 0 0 0 ${height}`}
            fill="none"
            stroke="currentColor"
            strokeDasharray={dash}
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#${patternId})`} height="100%" width="100%" />
    </svg>
  );
}

export type { GridPatternProps };
