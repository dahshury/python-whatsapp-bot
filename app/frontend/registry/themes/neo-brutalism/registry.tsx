"use client";
import type { UiRegistryMap } from "@/lib/ui-registry";

// Important: Avoid overriding structural components (like Button) at runtime to
// keep SSR and client markup identical and prevent hydration mismatches.
// Neo-brutalism visuals are applied via composites and CSS, not by swapping components.
export const neoRegistry: UiRegistryMap = {};
