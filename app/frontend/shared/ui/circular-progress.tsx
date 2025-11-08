"use client";

import { cn } from "@shared/libs/utils";
import {
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

// Progress calculation constants
const PERCENTAGE_MULTIPLIER = 100;
const DEFAULT_MAX_VALUE = 100;
const DEFAULT_MIN_VALUE = 0;
const DEFAULT_SIZE = 48;
const DEFAULT_STROKE_WIDTH = 4;
const CIRCLE_RADIUS_OFFSET = 2;
const CIRCLE_RADIUS_CALC = `calc(50% - ${CIRCLE_RADIUS_OFFSET}px)`;
const DEFAULT_RADIUS = 22; // (48 - 4) / 2
const CIRCUMFERENCE_QUARTER = 0.25;

const CircularProgressContext = createContext<{
  value: number | null;
  max: number;
  min: number;
}>({
  value: null,
  max: DEFAULT_MAX_VALUE,
  min: DEFAULT_MIN_VALUE,
});

const CircularProgressProvider = CircularProgressContext.Provider;

const useCircularProgressContext = () => {
  const context = useContext(CircularProgressContext);
  return context;
};

type CircularProgressRootProps = {
  value?: number | null;
  max?: number;
  min?: number;
  size?: number;
  className?: string;
  children: ReactNode;
};

const CircularProgressRoot = forwardRef<
  HTMLDivElement,
  CircularProgressRootProps
>(
  (
    {
      value = null,
      max = DEFAULT_MAX_VALUE,
      min = DEFAULT_MIN_VALUE,
      size = DEFAULT_SIZE,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const clampedValue = useMemo(() => {
      if (value === null || value === undefined) {
        return null;
      }
      if (max <= min) {
        return null;
      }
      return Math.max(min, Math.min(max, value));
    }, [value, max, min]);

    const percentage = useMemo(() => {
      if (clampedValue === null) {
        return null;
      }
      return ((clampedValue - min) / (max - min)) * PERCENTAGE_MULTIPLIER;
    }, [clampedValue, max, min]);

    const state = useMemo(() => {
      if (clampedValue === null) {
        return "indeterminate";
      }
      if (clampedValue >= max) {
        return "complete";
      }
      return "loading";
    }, [clampedValue, max]);

    return (
      <CircularProgressProvider value={{ value: clampedValue, max, min }}>
        <div
          className={cn("relative inline-flex", className)}
          data-max={max}
          data-min={min}
          data-percentage={percentage ?? undefined}
          data-state={state}
          data-value={clampedValue ?? undefined}
          ref={ref}
          style={{ width: size, height: size }}
          {...props}
        >
          {children}
        </div>
      </CircularProgressProvider>
    );
  }
);
CircularProgressRoot.displayName = "CircularProgressRoot";

type CircularProgressIndicatorProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
  children: ReactNode;
};

const CircularProgressIndicator = forwardRef<
  SVGSVGElement,
  CircularProgressIndicatorProps
>(
  (
    {
      size = DEFAULT_SIZE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { value, max, min } = useCircularProgressContext();
    const percentage =
      value === null
        ? null
        : ((value - min) / (max - min)) * PERCENTAGE_MULTIPLIER;

    let state: "indeterminate" | "complete" | "loading";
    if (value === null) {
      state = "indeterminate";
    } else if (value >= max) {
      state = "complete";
    } else {
      state = "loading";
    }

    return (
      <svg
        aria-label="Circular progress indicator"
        className={cn("-rotate-90 transform", className)}
        data-max={max}
        data-min={min}
        data-percentage={percentage ?? undefined}
        data-state={state}
        data-value={value ?? undefined}
        height={size}
        ref={ref}
        width={size}
        {...props}
      >
        <title>
          Progress:{" "}
          {percentage !== null ? `${Math.round(percentage)}%` : "indeterminate"}
        </title>
        {children}
      </svg>
    );
  }
);
CircularProgressIndicator.displayName = "CircularProgressIndicator";

type CircularProgressTrackProps = {
  className?: string;
};

const CircularProgressTrack = forwardRef<
  SVGCircleElement,
  CircularProgressTrackProps
>(({ className, ...props }, ref) => {
  const { value } = useCircularProgressContext();

  let state: "indeterminate" | "complete" | "loading";
  if (value === null) {
    state = "indeterminate";
  } else if (value >= DEFAULT_MAX_VALUE) {
    state = "complete";
  } else {
    state = "loading";
  }

  return (
    <circle
      className={cn("stroke-current text-muted-foreground/20", className)}
      cx="50%"
      cy="50%"
      data-state={state}
      fill="none"
      r={CIRCLE_RADIUS_CALC}
      ref={ref}
      strokeWidth={String(DEFAULT_STROKE_WIDTH)}
      {...props}
    />
  );
});
CircularProgressTrack.displayName = "CircularProgressTrack";

type CircularProgressRangeProps = {
  className?: string;
};

const CircularProgressRange = forwardRef<
  SVGCircleElement,
  CircularProgressRangeProps
>(({ className, ...props }, ref) => {
  const { value, max, min } = useCircularProgressContext();
  const percentage =
    value === null
      ? null
      : ((value - min) / (max - min)) * PERCENTAGE_MULTIPLIER;

  let state: "indeterminate" | "complete" | "loading";
  if (value === null) {
    state = "indeterminate";
  } else if (value >= max) {
    state = "complete";
  } else {
    state = "loading";
  }

  // Calculate radius based on SVG size (assuming 48px default, strokeWidth 4)
  // radius = (size - strokeWidth) / 2 = (48 - 4) / 2 = 22
  const radius = DEFAULT_RADIUS;
  const circumference = 2 * Math.PI * radius;
  const offset =
    percentage === null
      ? circumference * CIRCUMFERENCE_QUARTER
      : circumference - (percentage / PERCENTAGE_MULTIPLIER) * circumference;

  return (
    <circle
      className={cn(
        "stroke-current text-primary transition-all duration-300 ease-in-out",
        state === "indeterminate" && "animate-spin-around",
        className
      )}
      cx="50%"
      cy="50%"
      data-max={max}
      data-min={min}
      data-state={state}
      data-value={value ?? undefined}
      fill="none"
      r={CIRCLE_RADIUS_CALC}
      ref={ref}
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      strokeLinecap="round"
      strokeWidth={String(DEFAULT_STROKE_WIDTH)}
      {...props}
    />
  );
});
CircularProgressRange.displayName = "CircularProgressRange";

type CircularProgressValueTextProps = {
  className?: string;
  children?: ReactNode;
};

const CircularProgressValueText = forwardRef<
  HTMLSpanElement,
  CircularProgressValueTextProps
>(({ className, children, ...props }, ref) => {
  const { value } = useCircularProgressContext();

  let state: "indeterminate" | "complete" | "loading";
  if (value === null) {
    state = "indeterminate";
  } else if (value >= DEFAULT_MAX_VALUE) {
    state = "complete";
  } else {
    state = "loading";
  }

  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center font-medium text-foreground text-sm",
        className
      )}
      data-state={state}
      ref={ref}
      {...props}
    >
      {children ?? (value !== null ? `${Math.round(value)}%` : null)}
    </span>
  );
});
CircularProgressValueText.displayName = "CircularProgressValueText";

export {
  CircularProgressRoot,
  CircularProgressIndicator,
  CircularProgressTrack,
  CircularProgressRange,
  CircularProgressValueText,
};
