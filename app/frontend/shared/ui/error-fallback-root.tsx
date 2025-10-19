"use client";

import { Button } from "@ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

type RootErrorFallbackProps = {
	error: Error;
	resetErrorBoundary: () => void;
};

export function RootErrorFallback({
	error,
	resetErrorBoundary,
}: RootErrorFallbackProps) {
	const handleRefresh = () => {
		resetErrorBoundary();
		if (typeof window !== "undefined") {
			window.location.href = "/";
		}
	};

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-red-50 to-red-100 p-4 dark:from-red-950 dark:to-red-900">
			<div className="flex flex-col items-center gap-4">
				<div className="rounded-full bg-red-200 p-4 dark:bg-red-800">
					<AlertCircle className="h-8 w-8 text-red-600 dark:text-red-200" />
				</div>

				<div className="text-center">
					<h1 className="font-bold text-2xl text-red-900 dark:text-red-100">
						Something Went Wrong
					</h1>
					<p className="mt-2 text-red-800 text-sm dark:text-red-200">
						We encountered an unexpected error. Please try refreshing the page.
					</p>
				</div>
			</div>

			{process.env.NODE_ENV === "development" && (
				<details className="w-full max-w-2xl">
					<summary className="cursor-pointer font-mono text-red-700 text-xs dark:text-red-300">
						Error details (development only)
					</summary>
					<pre className="mt-4 overflow-auto rounded bg-red-900 p-4 text-red-100 text-xs">
						{error.message}
						{"\n\n"}
						{error.stack}
					</pre>
				</details>
			)}

			<Button className="gap-2" onClick={handleRefresh} size="lg">
				<RotateCcw className="h-4 w-4" />
				Refresh Page
			</Button>
		</div>
	);
}

