"use client";

import { cn } from "@shared/libs/utils";
import { LoaderIcon } from "lucide-react";
import type React from "react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
