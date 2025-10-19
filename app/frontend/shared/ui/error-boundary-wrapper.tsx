"use client";

import type { ErrorContext } from "@shared/libs/utils/error-logger";
import { logError } from "@shared/libs/utils/error-logger";
import type React from "react";
import { ErrorBoundary as ErrorBoundaryComponent } from "react-error-boundary";

type ErrorBoundaryWrapperProps = {
	children: React.ReactNode;
	fallback: React.ComponentType<{
		error: Error;
		resetErrorBoundary: () => void;
	}>;
	feature?: string;
	component?: string;
	onError?: (error: Error) => void;
};

export function ErrorBoundaryWrapper({
	children,
	fallback: Fallback,
	feature,
	component,
	onError,
}: ErrorBoundaryWrapperProps) {
	const handleError = (error: Error) => {
		// Log error to monitoring service
		const ctx: ErrorContext = {
			...(feature ? { feature } : {}),
			...(component ? { component } : {}),
			action: "render",
		};
		logError(error, ctx);

		// Call optional custom error handler
		onError?.(error);
	};

	const handleReset = () => {
		// You can add additional cleanup here if needed
		// e.g., clear specific cache, reset state, etc.
	};

	return (
		<ErrorBoundaryComponent
			FallbackComponent={Fallback}
			onError={handleError}
			onReset={handleReset}
		>
			{children}
		</ErrorBoundaryComponent>
	);
}
