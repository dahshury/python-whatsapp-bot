"use client";

import { Slot } from "@radix-ui/react-slot";
import { useIsMobile } from "@shared/libs/hooks/use-mobile";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { PanelLeft } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ElementRef,
  memo,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const SIDEBAR_COOKIE_MAX_AGE_SECONDS =
  SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * DAYS_PER_WEEK;
const MILLISECONDS_PER_SECOND = 1000;
const SIDEBAR_WIDTH = "24rem";
const SIDEBAR_WIDTH_MOBILE = "24rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

const SidebarProvider = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ref,
  ...props
}: ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & { ref?: RefObject<HTMLDivElement | null> }) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  // Initialize with defaultOpen to ensure server/client consistency
  // Then update from persisted state after hydration
  const [_open, _setOpen] = useState(defaultOpen);

  // Read persisted state after hydration only
  useEffect(() => {
    if (openProp !== undefined) {
      return; // Don't override controlled state
    }

    try {
      const w = window as unknown as {
        cookieStore?: {
          get: (opts: { name: string }) => Promise<{ value: string } | null>;
        };
      };

      if (w.cookieStore && typeof w.cookieStore.get === "function") {
        w.cookieStore
          .get({ name: SIDEBAR_COOKIE_NAME })
          .then((cookie) => {
            if (cookie?.value === "false") {
              _setOpen(false);
            } else if (cookie?.value === "true") {
              _setOpen(true);
            }
          })
          .catch(() => {
            // Fallback to localStorage
            const stored = localStorage.getItem(SIDEBAR_COOKIE_NAME);
            if (stored === "false") {
              _setOpen(false);
            } else if (stored === "true") {
              _setOpen(true);
            }
          });
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem(SIDEBAR_COOKIE_NAME);
        if (stored === "false") {
          _setOpen(false);
        } else if (stored === "true") {
          _setOpen(true);
        }
      }
    } catch {
      // Ignore errors reading persisted state
    }
  }, [openProp]);

  const open = openProp ?? _open;
  const setOpen = useCallback(
    (value: boolean | ((previousValue: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // Persist sidebar state without directly writing document.cookie
      try {
        // Prefer Cookie Store API when available
        const w = window as unknown as {
          cookieStore?: {
            set: (opts: {
              name: string;
              value: string;
              expires?: number;
              path?: string;
            }) => Promise<void>;
          };
        };
        if (w.cookieStore && typeof w.cookieStore.set === "function") {
          w.cookieStore
            .set({
              name: SIDEBAR_COOKIE_NAME,
              value: String(openState),
              expires:
                Date.now() +
                SIDEBAR_COOKIE_MAX_AGE_SECONDS * MILLISECONDS_PER_SECOND,
              path: "/",
            })
            .catch(() => {
              // Ignore cookie store errors
            });
        } else {
          // Fallback to localStorage to avoid direct cookie assignment
          localStorage.setItem(SIDEBAR_COOKIE_NAME, String(openState));
        }
      } catch {
        // Swallow persistence errors silently
      }
    },
    [setOpenProp, open]
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = useCallback(
    () =>
      isMobile
        ? setOpenMobile((isOpen) => !isOpen)
        : setOpen((isOpen) => !isOpen),
    [isMobile, setOpen]
  );

  // Adds a keyboard shortcut to toggle the sidebar.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        className={cn(
          "group/sidebar-wrapper flex h-full w-full has-[[data-variant=inset]]:bg-sidebar",
          className
        )}
        dir="ltr"
        ref={ref}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            contain: "layout style size",
            willChange: "width",
            height: "100%",
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
};
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = ({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ref,
  ...props
}: ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
} & { ref?: RefObject<HTMLDivElement | null> }) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        className={cn(
          "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet onOpenChange={setOpenMobile} open={openMobile} {...props}>
        <SheetContent
          className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          data-mobile="true"
          data-sidebar="sidebar"
          side={side}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as CSSProperties
          }
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col" dir="ltr">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
      data-state={state}
      data-variant={variant}
      ref={ref}
      suppressHydrationWarning
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        className={cn(
          "relative w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]"
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        {...props}
      >
        <div
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
          data-sidebar="sidebar"
          dir="ltr"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
Sidebar.displayName = "Sidebar";

const SidebarTrigger = memo(
  ({
    className,
    onClick,
    ref,
    ...props
  }: ComponentProps<typeof Button> & {
    ref?: RefObject<ElementRef<typeof Button> | null>;
  }) => {
    const { toggleSidebar } = useSidebar();

    return (
      <Button
        className={cn("h-7 w-7", className)}
        data-sidebar="trigger"
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        ref={ref}
        size="icon"
        variant="ghost"
        {...props}
      >
        <PanelLeft />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarInset = memo(
  ({
    className,
    ref,
    ...props
  }: ComponentProps<"main"> & {
    ref?: RefObject<HTMLDivElement | null>;
  }) => (
    <main
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background",
        "md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
SidebarInset.displayName = "SidebarInset";

const SidebarHeader = ({
  className,
  ref,
  ...props
}: ComponentProps<"div"> & {
  ref?: RefObject<HTMLDivElement | null>;
}) => (
  <div
    className={cn("flex flex-col gap-2 p-2", className)}
    data-sidebar="header"
    ref={ref}
    {...props}
  />
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = ({
  className,
  ref,
  ...props
}: ComponentProps<"div"> & {
  ref?: RefObject<HTMLDivElement | null>;
}) => (
  <div
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
      className
    )}
    data-sidebar="content"
    ref={ref}
    {...props}
  />
);
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = ({
  className,
  ref,
  ...props
}: ComponentProps<"div"> & {
  ref?: RefObject<HTMLDivElement | null>;
}) => (
  <div
    className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
    data-sidebar="group"
    ref={ref}
    {...props}
  />
);
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = ({
  className,
  asChild = false,
  ref,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean } & {
  ref?: React.RefObject<HTMLDivElement | null>;
}) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-sidebar-foreground/70 text-xs outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      )}
      data-sidebar="group-label"
      ref={ref}
      {...props}
    />
  );
};
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupContent = ({
  className,
  ref,
  ...props
}: ComponentProps<"div"> & {
  ref?: RefObject<HTMLDivElement | null>;
}) => (
  <div
    className={cn("w-full text-sm", className)}
    data-sidebar="group-content"
    ref={ref}
    {...props}
  />
);
SidebarGroupContent.displayName = "SidebarGroupContent";

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
