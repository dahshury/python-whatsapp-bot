/**
 * Cached Dock Date Shell
 *
 * A cached wrapper for the dock date display that provides
 * static structure while allowing dynamic date content to be injected.
 */

"use cache";

import type { ReactNode } from "react";
import { cn } from "@/shared/libs/utils";

type CachedDockDateShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Cached Dock Date Shell
 *
 * The shell structure is cached and only re-renders when
 * className changes. Dynamic date content (children) can
 * update without triggering re-render of the shell.
 */
export function CachedDockDateShell({
  children,
  className,
}: CachedDockDateShellProps) {
  return (
    <div className={cn("flex min-w-0 items-center justify-center", className)}>
      {children}
    </div>
  );
}
