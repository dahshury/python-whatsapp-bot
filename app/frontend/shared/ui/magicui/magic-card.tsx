"use client";

import { cn } from "@shared/libs/utils";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";

type MagicCardProps = {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
};

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "#262626",
  gradientOpacity = 0.8,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (cardRef.current) {
        const { left, top } = cardRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
      }
    },
    [mouseX, mouseY]
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      if (!e.relatedTarget) {
        document.removeEventListener("mousemove", handleMouseMove);
        mouseX.set(-gradientSize);
        mouseY.set(-gradientSize);
      }
    },
    [handleMouseMove, mouseX, gradientSize, mouseY]
  );

  const handleMouseEnter = useCallback(() => {
    document.addEventListener("mousemove", handleMouseMove);
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [handleMouseMove, mouseX, gradientSize, mouseY]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [handleMouseEnter, handleMouseMove, handleMouseOut]);

  useEffect(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  // Check if border-0 is applied (for hover cards)
  // When border-0 is applied, the border comes from the parent (HoverCardContent)
  // We need to ensure inner divs don't cover the parent's border
  const hasNoBorder = className?.includes("border-0");
  // Use inset-[1px] to account for parent's 1px border width
  const insetClass = hasNoBorder ? "inset-[1px]" : "inset-px";
  // Explicitly set rounded-lg when border-0 to match HoverCardContent border-radius (0.5rem = 8px)
  const borderRadiusClass = hasNoBorder ? "rounded-lg" : "rounded-[inherit]";
  // When using inset-[1px], inner border-radius should be border-radius - inset
  // rounded-lg = 8px, so inner radius = 8px - 1px = 7px
  // Using direct pixel value to ensure proper rendering
  const innerBorderRadiusClass = hasNoBorder ? "rounded-[7px]" : borderRadiusClass;
  // Don't use overflow-hidden when border-0 is applied, as it can clip the parent's border
  const overflowClass = hasNoBorder ? "" : "overflow-hidden";

  return (
    <div
      className={cn("group relative", overflowClass, borderRadiusClass, className)}
      ref={cardRef}
    >
      {/* Outer gradient layer - only show when card has its own border */}
      {!hasNoBorder && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-border duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
            ${gradientFrom}, 
            ${gradientTo}, 
            var(--border) 100%
            )
            `,
          }}
        />
      )}
      <div className={cn("absolute bg-background", innerBorderRadiusClass, insetClass)} />
      <motion.div
        className={cn("pointer-events-none absolute opacity-0 transition-opacity duration-300 group-hover:opacity-100", innerBorderRadiusClass, insetClass)}
        style={{
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
          `,
          opacity: gradientOpacity,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
