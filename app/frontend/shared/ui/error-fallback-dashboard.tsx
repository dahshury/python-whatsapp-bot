"use client";

import { Button } from "@ui/button";
import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";

type DashboardErrorFallbackProps = {
	error: Error;
	resetErrorBoundary: () => void;
};

export function DashboardErrorFallback({
	error,
	resetErrorBoundary,
}: DashboardErrorFallbackProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900 dark:bg-orange-950">
			<div className="flex items-center gap-2 font-semibold text-lg text-orange-900 dark:text-orange-100">
				<AlertTriangle className="h-5 w-5" />
				Dashboard Error
			</div>

			<p className="text-center text-orange-800 text-sm dark:text-orange-200">
				The dashboard encountered an error while loading analytics. You can
				still use other features.
			</p>

			{process.env.NODE_ENV === "development" && (
				<details className="w-full">
					<summary className="cursor-pointer font-mono text-orange-700 text-xs dark:text-orange-300">
						Error details
					</summary>
					<pre className="mt-2 overflow-auto rounded bg-orange-900 p-2 text-orange-100 text-xs">
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
				<a href="/">
					<Button className="gap-2" size="sm" variant="outline">
						<Calendar className="h-4 w-4" />
						Go to Calendar
					</Button>
				</a>
			</div>
		</div>
	);
}

