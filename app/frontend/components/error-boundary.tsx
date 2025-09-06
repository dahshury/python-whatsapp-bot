"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarSkeleton } from "./calendar-skeleton";

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
	isRecovering?: boolean;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, isRecovering: false };
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.setState({
			error,
			errorInfo,
		});

		// Log error in development
		if (process.env.NODE_ENV === "development") {
			console.group("🚨 Error Boundary Caught Error");
			console.error("Error:", error);
			console.error("Error Info:", errorInfo);
			console.groupEnd();
		}
	}

	retry = () => {
		// Avoid state update loops by resetting fully and deferring a tick
		this.setState({ hasError: false });
	};

	render() {
		const { hasError, error, isRecovering } = this.state;

		if (hasError && error) {
			return (
				<div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-6 bg-card rounded-lg shadow-sm">
					<AlertCircle className="h-12 w-12 text-destructive mb-4" />
					<h2 className="text-2xl font-semibold text-foreground">
						Something went wrong
					</h2>
					<div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md max-w-2xl">
						<p className="text-sm font-mono text-destructive whitespace-pre-wrap">
							{error.message}
						</p>
						{error.stack && (
							<details className="mt-2">
								<summary className="cursor-pointer text-sm font-medium text-destructive">
									Error details
								</summary>
								<pre className="mt-2 text-xs text-destructive/80 overflow-x-auto">
									{error.stack}
								</pre>
							</details>
						)}
					</div>
					<p className="text-muted-foreground">
						Please refresh the page or try again.
					</p>
					<div className="flex gap-2 mt-6">
						<Button onClick={() => window.location.reload()} variant="default">
							Refresh Page
						</Button>
						<Button
							onClick={() =>
								this.setState({ hasError: false, error: undefined })
							}
							variant="outline"
						>
							Try Again
						</Button>
					</div>
				</div>
			);
		}

		// Recovery UI
		if (isRecovering) {
			return (
				<div className="absolute inset-0 bg-background/90 flex items-center justify-center">
					<div className="text-center space-y-4 p-6 bg-card rounded-lg shadow-lg border border-border">
						<RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
						<h3 className="text-lg font-semibold text-foreground">
							Recovering...
						</h3>
						<p className="text-sm text-muted-foreground max-w-sm">
							The application is being restored. Please wait...
						</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// Calendar-specific error fallback
export function CalendarErrorFallback({
	error,
	retry,
}: {
	error?: Error;
	retry: () => void;
}) {
	return (
		<div className="relative">
			<CalendarSkeleton />
			<div className="absolute inset-0 bg-background/90 flex items-center justify-center">
				<div className="text-center space-y-4 p-6 bg-card rounded-lg shadow-lg border border-border">
					<div className="text-4xl mb-2">📅💥</div>
					<h3 className="text-lg font-semibold text-foreground">
						Calendar Loading Error
					</h3>
					<p className="text-sm text-muted-foreground max-w-sm">
						There was an issue loading the calendar. This is likely a temporary
						development server issue.
					</p>

					{process.env.NODE_ENV === "development" && error && (
						<details className="text-left text-xs bg-destructive/10 p-3 rounded border border-destructive/30">
							<summary className="cursor-pointer font-medium text-destructive">
								Error Details
							</summary>
							<pre className="mt-2 text-destructive/80 overflow-auto max-h-32">
								{error.message}
							</pre>
						</details>
					)}

					<div className="flex gap-2 justify-center">
						<Button onClick={retry} size="sm" variant="outline">
							Retry
						</Button>
						<Button onClick={() => window.location.reload()} size="sm">
							Refresh
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
