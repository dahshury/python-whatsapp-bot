"use client";

import { Button } from "@ui/button";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";

type DocumentErrorFallbackProps = {
	error: Error;
	resetErrorBoundary: () => void;
};

export function DocumentErrorFallback({
	error,
	resetErrorBoundary,
}: DocumentErrorFallbackProps) {
	const handleExport = () => {
		// Try to export any saved state
		try {
			const saved = localStorage.getItem("document:autosave");
			if (saved) {
				const element = document.createElement("a");
				element.setAttribute("href", `data:text/plain;charset=utf-8,${saved}`);
				element.setAttribute("download", "document-backup.json");
				element.style.display = "none";
				document.body.appendChild(element);
				element.click();
				document.body.removeChild(element);
			}
		} catch {
			// Silently fail
		}
	};

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
			<div className="flex items-center gap-2 font-semibold text-lg text-red-900 dark:text-red-100">
				<AlertTriangle className="h-5 w-5" />
				Document Error
			</div>

			<p className="text-center text-red-800 text-sm dark:text-red-200">
				The document editor encountered an error. Your work has been saved
				automatically.
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
					Reload
				</Button>
				<Button
					className="gap-2"
					onClick={handleExport}
					size="sm"
					variant="outline"
				>
					<Download className="h-4 w-4" />
					Export Backup
				</Button>
			</div>
		</div>
	);
}

