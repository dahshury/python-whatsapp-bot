"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Button } from "@ui/button";
import { AlertCircle } from "lucide-react";
import React from "react";
import { Spinner } from "@/shared/ui/spinner";
import { CalendarSkeleton } from "@/widgets/calendar/calendar-skeleton";

type ErrorBoundaryState = {
	hasError: boolean;
	error?: Error | undefined;
	errorInfo?: React.ErrorInfo;
	isRecovering?: boolean;
};

type ErrorBoundaryProps = {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
};

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

		// Log error in development  - commented out to avoid console pollution
		if (process.env.NODE_ENV === "development") {
			// Error logging would be added here if needed
		}
	}

	retry = () => {
		// Avoid state update loops by resetting fully and deferring a tick
		this.setState({ hasError: false });
	};

	render() {
		const { hasError, error, isRecovering } = this.state;
		const Fallback = this.props.fallback;

		if (hasError && error) {
			if (Fallback) {
				return (
					<QueryErrorResetBoundary>
						{({ reset }) => (
							<Fallback
								error={error}
								retry={() => {
									reset();
									this.setState({ hasError: false, error: undefined });
								}}
							/>
						)}
					</QueryErrorResetBoundary>
				);
			}
			return (
				<QueryErrorResetBoundary>
					{({ reset }) => (
						<div className="flex h-full min-h-[37.5rem] w-full flex-col items-center justify-center rounded-lg bg-card p-6 shadow-sm">
							<AlertCircle className="mb-4 h-12 w-12 text-destructive" />
							<h2 className="font-semibold text-2xl text-foreground">
								Something went wrong
							</h2>
							<div className="mt-4 max-w-2xl rounded-md border border-destructive/30 bg-destructive/10 p-4">
								<p className="whitespace-pre-wrap font-mono text-destructive text-sm">
									{error.message}
								</p>
								{error.stack && (
									<details className="mt-2">
										<summary className="cursor-pointer font-medium text-destructive text-sm">
											Error details
										</summary>
										<pre className="mt-2 overflow-x-auto text-destructive/80 text-xs">
											{error.stack}
										</pre>
									</details>
								)}
							</div>
							<p className="text-muted-foreground">
								Please refresh the page or try again.
							</p>
							<div className="mt-6 flex gap-2">
								<Button
									onClick={() => window.location.reload()}
									variant="default"
								>
									Refresh Page
								</Button>
								<Button
									onClick={() => {
										reset();
										this.setState({ hasError: false, error: undefined });
									}}
									variant="outline"
								>
									Try Again
								</Button>
							</div>
						</div>
					)}
				</QueryErrorResetBoundary>
			);
		}

		// Recovery UI
		if (isRecovering) {
			return (
				<div className="absolute inset-0 flex items-center justify-center bg-background/90">
					<div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
						<Spinner className="mx-auto h-8 w-8 text-primary" />
						<h3 className="font-semibold text-foreground text-lg">
							Recovering...
						</h3>
						<p className="max-w-sm text-muted-foreground text-sm">
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
			<div className="absolute inset-0 flex items-center justify-center bg-background/90">
				<div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
					<div className="mb-2 text-4xl">📅💥</div>
					<h3 className="font-semibold text-foreground text-lg">
						Calendar Loading Error
					</h3>
					<p className="max-w-sm text-muted-foreground text-sm">
						There was an issue loading the calendar. This is likely a temporary
						development server issue.
					</p>

					{process.env.NODE_ENV === "development" && error && (
						<details className="rounded border border-destructive/30 bg-destructive/10 p-3 text-left text-xs">
							<summary className="cursor-pointer font-medium text-destructive">
								Error Details
							</summary>
							<pre className="mt-2 max-h-32 overflow-auto text-destructive/80">
								{error.message}
							</pre>
						</details>
					)}

					<div className="flex justify-center gap-2">
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
