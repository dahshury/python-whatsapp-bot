"use client";

import { Button } from "@ui/button";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";

type CalendarErrorFallbackProps = {
	error: Error;
	resetErrorBoundary: () => void;
};

export function CalendarErrorFallback({
	error,
	resetErrorBoundary,
}: CalendarErrorFallbackProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
			<div className="flex items-center gap-2 font-semibold text-lg text-red-900 dark:text-red-100">
				<AlertTriangle className="h-5 w-5" />
				Calendar Error
			</div>

			<p className="text-center text-red-800 text-sm dark:text-red-200">
				The calendar encountered an unexpected error. Your other features (chat,
				documents, dashboard) are still available.
			</p>

			{process.env.NODE_ENV === "development" && (
				<details className="w-full">
					<summary className="cursor-pointer font-mono text-red-700 text-xs dark:text-red-300">
						Error details
					</summary>
					<pre className="mt-2 overflow-auto rounded bg-red-900 p-2 text-red-100 text-xs">
						{error.message}
						{error.stack}
					</pre>
				</details>
			)}

			<div className="flex gap-2">
				<Button
					className="gap-2"
					onClick={resetErrorBoundary}
					size="sm"
					variant="default"
				>
					<RefreshCw className="h-4 w-4" />
					Try Again
				</Button>
				<a href="/dashboard">
					<Button className="gap-2" size="sm" variant="outline">
						<BarChart3 className="h-4 w-4" />
						Go to Dashboard
					</Button>
				</a>
			</div>
		</div>
	);
}

