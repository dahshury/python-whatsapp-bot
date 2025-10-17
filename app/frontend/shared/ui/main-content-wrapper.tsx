"use client";

import type React from "react";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

type MainContentWrapperProps = {
	children: React.ReactNode;
};

export function MainContentWrapper({ children }: MainContentWrapperProps) {
	return (
		<ThemedScrollbar
			className="scrollbar-autohide main-content-scrollbar flex-1"
			disableTracksWidthCompensation={true}
			noScrollX={true}
			removeTrackXWhenNotUsed={true}
			rtl={false}
			style={{ height: "100%" }}
		>
			{children}
		</ThemedScrollbar>
	);
}
