"use client";

import { Lock } from "lucide-react";
import type { FC } from "react";
import { Z_INDEX } from "@/shared/libs/ui/z-index";

export const DocumentLockOverlay: FC<{ message?: string }> = ({ message }) => (
	<div
		className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]"
		style={{ zIndex: Z_INDEX.FULLSCREEN_BACKDROP }}
	>
		<div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2 text-muted-foreground text-sm shadow">
			<Lock className="size-4 opacity-70" />
			<span>{message || "Locked"}</span>
		</div>
	</div>
);
