"use client";

import { Button } from "@ui/button";
import { AlertTriangle, MessageSquare, RefreshCw } from "lucide-react";

type ChatErrorFallbackProps = {
	error: Error;
	resetErrorBoundary: () => void;
};

export function ChatErrorFallback({
	error,
	resetErrorBoundary,
}: ChatErrorFallbackProps) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
			<div className="flex items-center gap-2 font-semibold text-amber-900 text-lg dark:text-amber-100">
				<AlertTriangle className="h-5 w-5" />
				Chat Error
			</div>

			<p className="text-center text-amber-800 text-sm dark:text-amber-200">
				Chat temporarily unavailable. Conversations are being restored from
				cache.
			</p>

			{process.env.NODE_ENV === "development" && (
				<details className="w-full">
					<summary className="cursor-pointer font-mono text-amber-700 text-xs dark:text-amber-300">
						Error details
					</summary>
					<pre className="mt-2 overflow-auto rounded bg-amber-900 p-2 text-amber-100 text-xs">
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
					Retry
				</Button>
				<a href="/dashboard">
					<Button className="gap-2" size="sm" variant="outline">
						<MessageSquare className="h-4 w-4" />
						Try Later
					</Button>
				</a>
			</div>
		</div>
	);
}

