"use client";

import { cn } from "@shared/libs/utils";
import { AnimatePresence, motion } from "framer-motion";
import type { HTMLAttributes, JSX, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";

export type MenuBarItem = {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

interface MenuBarProps extends HTMLAttributes<HTMLDivElement> {
  items: MenuBarItem[];
  menuClassName?: string;
  buttonClassName?: string;
  iconWrapperClassName?: string;
}

const springConfig = {
  duration: 0.3,
  ease: "easeInOut" as const,
};

export function MenuBar({
  items,
  className,
  menuClassName,
  buttonClassName,
  iconWrapperClassName,
  ...props
}: MenuBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 0,
    width: 0,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[activeIndex] as HTMLElement;
      const menuRect = menuRef.current.getBoundingClientRect();
      const itemRect = menuItem.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const left =
        itemRect.left -
        menuRect.left +
        (itemRect.width - tooltipRect.width) / 2;

      setTooltipPosition({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width,
      });
    }
  }, [activeIndex]);

  return (
    <div className={cn("relative bottom-menu-scope", className)} {...props}>
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="-top-[31px] pointer-events-none absolute right-0 left-0 z-50"
            exit={{ opacity: 0, y: 5 }}
            initial={{ opacity: 0, y: 5 }}
            transition={springConfig}
          >
            <motion.div
              animate={{ x: tooltipPosition.left }}
              className={cn(
                "inline-flex h-7 items-center justify-center overflow-hidden rounded-lg px-3",
                "bg-background/95 backdrop-blur",
                "border border-border/50",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              )}
              initial={{ x: tooltipPosition.left }}
              ref={tooltipRef}
              style={{ width: "auto" }}
              transition={springConfig}
            >
              <p className="whitespace-nowrap font-medium text-[13px] leading-tight">
                {items[activeIndex]?.label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "z-10 inline-flex h-10 items-center justify-center gap-[3px] overflow-hidden px-1.5",
          "rounded-full bg-background/95 backdrop-blur",
          "border border-border/50",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.1)]",
          "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_-4px_rgba(0,0,0,0.2)]",
          menuClassName
        )}
        ref={menuRef}
      >
        {items.map((item, index) => (
          <button
            className={cn(
              "flex h-[1.6rem] w-[1.6rem] items-center justify-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-muted/80",
              item.disabled ? "cursor-not-allowed opacity-50" : "",
              buttonClassName
            )}
            disabled={item.disabled}
            key={`${item.label}-${index}`}
            onClick={item.disabled ? undefined : item.onClick}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            type="button"
          >
            <div className="flex items-center justify-center">
              <div
                className={cn(
                  "flex h-[1.125rem] w-[1.125rem] items-center justify-center overflow-hidden",
                  iconWrapperClassName
                )}
              >
                <item.icon className="h-full w-full" />
              </div>
            </div>
            <span className="sr-only">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
