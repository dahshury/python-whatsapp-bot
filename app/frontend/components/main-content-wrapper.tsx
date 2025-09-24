"use client";

import type React from "react";
import { ThemedScrollbar } from "@/components/themed-scrollbar";

interface MainContentWrapperProps {
	children: React.ReactNode;
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
	return (
		<ThemedScrollbar
			className="flex-1 scrollbar-autohide main-content-scrollbar"
			style={{ height: "100%" }}
			disableTracksWidthCompensation={true}
			rtl={false}
		>
			{children}
		</ThemedScrollbar>
	);
}
