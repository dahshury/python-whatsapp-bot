"use client";

import { AlertTriangle, RefreshCw, Server } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import { i18n } from "@/lib/i18n";

interface BackendConnectionOverlayProps {
	onRetry: () => void;
	isRetrying?: boolean;
}

export function BackendConnectionOverlay({
	onRetry,
	isRetrying = false,
}: BackendConnectionOverlayProps) {
	const { isRTL } = useLanguage();
	const [copied, setCopied] = useState(false);

	const copyToClipboard = useCallback(async () => {
		try {
			await navigator.clipboard.writeText("python app/backend/main.py");
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
		}
	}, []);

	return (
		<div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-md mx-auto border-destructive/20 bg-card">
				<CardHeader className="text-center space-y-4">
					<div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
						<Server className="w-8 h-8 text-destructive" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-lg font-semibold text-foreground">
							{i18n.getMessage("backend_connection_error_title", isRTL)}
						</CardTitle>
						<CardDescription className="text-sm text-muted-foreground">
							{i18n.getMessage("backend_connection_error_description", isRTL)}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="bg-muted/50 p-4 rounded-lg border border-border">
						<p className="text-sm font-medium text-foreground mb-2">
							{i18n.getMessage("backend_connection_error_instructions", isRTL)}
						</p>
						<div className="flex items-center gap-2 bg-background border border-border rounded-md p-2">
							<code className="text-sm font-mono text-foreground flex-1">
								python app/backend/main.py
							</code>
							<Button
								size="sm"
								variant="ghost"
								onClick={copyToClipboard}
								className="h-auto p-1 text-xs"
							>
								{copied ? "✓" : "📋"}
							</Button>
						</div>
					</div>

					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<AlertTriangle className="w-4 h-4" />
						<span>
							{isRTL
								? "تأكد من أن الخادم يعمل على http://localhost:8000"
								: "Ensure the server is running on http://localhost:8000"}
						</span>
					</div>

					<Button
						onClick={onRetry}
						disabled={isRetrying}
						className="w-full"
						size="lg"
					>
						{isRetrying ? (
							<>
								<RefreshCw className="w-4 h-4 mr-2 animate-spin" />
								{i18n.getMessage("backend_connection_checking", isRTL)}
							</>
						) : (
							<>
								<RefreshCw className="w-4 h-4 mr-2" />
								{i18n.getMessage("backend_connection_error_retry", isRTL)}
							</>
						)}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
} 