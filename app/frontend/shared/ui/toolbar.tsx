"use client";

/**
 * @author: @dorian_baffier
 * @description: Toolbar
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { cn } from "@shared/libs/utils";
import {
  Bell,
  CircleUserRound,
  Edit2,
  FileDown,
  Frame,
  Layers,
  Lock,
  type LucideIcon,
  MousePointer2,
  Move,
  Palette,
  Shapes,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const NOTIFICATION_TIMEOUT_MS = 1500;

type ToolbarItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  type?: never;
};

type ToolbarProps = {
  className?: string;
};

const buttonVariants: Variants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants: Variants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const notificationVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: -10 },
  exit: { opacity: 0, y: -20 },
};

const lineVariants: Variants = {
  initial: { scaleX: 0, x: "-50%" },
  animate: {
    scaleX: 1,
    x: "0%",
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    scaleX: 0,
    x: "50%",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const transition = { type: "spring" as const, bounce: 0, duration: 0.4 };

export function Toolbar({ className }: ToolbarProps) {
  const [selected, setSelected] = useState<string | null>("select");
  const [isToggled, setIsToggled] = useState(false);
  const [activeNotification, setActiveNotification] = useState<string | null>(
    null
  );
  const outsideClickRef = useRef(null);

  const toolbarItems: ToolbarItem[] = [
    { id: "select", title: "Select", icon: MousePointer2 },
    { id: "move", title: "Move", icon: Move },
    { id: "shapes", title: "Shapes", icon: Shapes },
    { id: "layers", title: "Layers", icon: Layers },
    { id: "frame", title: "Frame", icon: Frame },
    { id: "properties", title: "Properties", icon: SlidersHorizontal },
    { id: "export", title: "Export", icon: FileDown },
    { id: "share", title: "Share", icon: Share2 },
    { id: "notifications", title: "Notifications", icon: Bell },
    { id: "profile", title: "Profile", icon: CircleUserRound },
    { id: "appearance", title: "Appearance", icon: Palette },
  ];

  const handleItemClick = (itemId: string) => {
    setSelected(selected === itemId ? null : itemId);
    setActiveNotification(itemId);
    setTimeout(() => setActiveNotification(null), NOTIFICATION_TIMEOUT_MS);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex items-center gap-3 p-2",
          "bg-background",
          "rounded-xl border",
          "transition-all duration-200",
          className
        )}
        ref={outsideClickRef}
      >
        <AnimatePresence>
          {activeNotification && (
            <motion.div
              animate="animate"
              className="-top-8 -translate-x-1/2 absolute left-1/2 z-50 transform"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3 }}
              variants={notificationVariants}
            >
              <div className="rounded-full bg-primary px-3 py-1 text-primary-foreground text-xs">
                {
                  toolbarItems.find((item) => item.id === activeNotification)
                    ?.title
                }{" "}
                clicked!
              </div>
              <motion.div
                animate="animate"
                className="-bottom-1 absolute left-1/2 h-[0.125rem] w-full origin-left bg-primary"
                exit="exit"
                initial="initial"
                variants={lineVariants}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {toolbarItems.map((item) => (
            <motion.button
              animate="animate"
              className={cn(
                "relative flex items-center rounded-none px-3 py-2",
                "font-medium text-sm transition-colors duration-300",
                selected === item.id
                  ? "rounded-lg bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              custom={selected === item.id}
              initial={false}
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              transition={transition}
              variants={buttonVariants}
            >
              <item.icon
                className={cn(
                  selected === item.id && "text-primary-foreground"
                )}
                size={16}
              />
              <AnimatePresence initial={false}>
                {selected === item.id && (
                  <motion.span
                    animate="animate"
                    className="overflow-hidden"
                    exit="exit"
                    initial="initial"
                    transition={transition}
                    variants={spanVariants}
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}

          <motion.button
            className={cn(
              "flex items-center gap-2 px-4 py-2",
              "rounded-xl border shadow-sm transition-all duration-200",
              "hover:shadow-md active:border-primary/50",
              isToggled
                ? [
                    "bg-primary text-primary-foreground",
                    "border-primary/30",
                    "hover:bg-primary/90",
                    "hover:border-primary/40",
                  ]
                : [
                    "bg-background text-muted-foreground",
                    "border-border/30",
                    "hover:bg-muted",
                    "hover:text-foreground",
                    "hover:border-border/40",
                  ]
            )}
            onClick={() => setIsToggled(!isToggled)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isToggled ? (
              <Edit2 className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            <span className="font-medium text-sm">
              {isToggled ? "On" : "Off"}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Lightweight toolbar without animations for simple use-cases
export type SimpleToolbarItem = {
  id: string;
  title?: string;
  icon?: LucideIcon;
  tooltipTitle?: string;
  tooltipDescription?: string;
  tooltipIcon?: LucideIcon;
};

export function MiniToolbar({
  items,
  value,
  onChange,
  className,
  compact = true,
}: {
  items: SimpleToolbarItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const containerHeight = compact ? "h-[1.6rem]" : "h-9";
  // Make buttons match container height exactly to avoid vertical mismatch
  const buttonHeight = "h-full";
  const iconSize = compact ? "h-[0.85rem] w-[0.85rem]" : "h-4 w-4";

  return (
    <div
      className={cn(
        "inline-flex items-center divide-x rounded-theme border bg-background",
        containerHeight,
        className
      )}
    >
      {items.map((item) => {
        const isActive = value === item.id;
        const ButtonIcon = item.icon;
        const contentProvided =
          Boolean(item.tooltipTitle) || Boolean(item.tooltipDescription);
        const TooltipIcon = item.tooltipIcon || ButtonIcon;

        const buttonEl = (
          <button
            aria-pressed={isActive}
            className={cn(
              "relative flex items-center gap-1 px-2 no-underline transition-none focus:outline-none focus:ring-0",
              buttonHeight,
              isActive
                ? "rounded-theme bg-accent text-accent-foreground"
                : "bg-transparent text-muted-foreground"
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            {ButtonIcon ? <ButtonIcon className={iconSize} /> : null}
            <AnimatePresence initial={false}>
              {isActive && item.title && (
                <motion.span
                  animate="animate"
                  className="overflow-hidden text-[0.72rem] leading-none"
                  exit="exit"
                  initial="initial"
                  transition={{
                    type: "tween",
                    duration: 0.15,
                    ease: "easeOut",
                  }}
                  variants={spanVariants}
                >
                  {item.title}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        );

        return contentProvided ? (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
            <TooltipContent className="py-3" sideOffset={6}>
              <div className="flex gap-3">
                {TooltipIcon ? (
                  <TooltipIcon
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 opacity-60"
                    size={16}
                  />
                ) : null}
                <div className="space-y-1">
                  <p className="font-medium text-[0.8125rem]">
                    {item.tooltipTitle || item.title || item.id}
                  </p>
                  {item.tooltipDescription ? (
                    <p className="text-muted-foreground text-xs">
                      {item.tooltipDescription}
                    </p>
                  ) : null}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          buttonEl
        );
      })}
    </div>
  );
}
