"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

// We keep this wrapper isolated so we can swap implementation (streamed vs boundary) later
// without touching the rest of the app.

export function QueryHydration({
	children,
	state,
}: PropsWithChildren & { state?: DehydratedState }) {
	return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
