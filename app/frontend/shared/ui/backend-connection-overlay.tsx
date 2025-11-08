"use client";

import { i18n } from "@shared/libs/i18n";
import { Button } from "@ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { AlertTriangle, RefreshCw, Server } from "lucide-react";
import { useCallback, useState } from "react";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import { writeClipboardText } from "@/shared/libs/clipboard";
import { Spinner } from "@/shared/ui/spinner";

type BackendConnectionOverlayProps = {
  onRetry: () => void;
  isRetrying?: boolean;
};

export function BackendConnectionOverlay({
  onRetry,
  isRetrying = false,
}: BackendConnectionOverlayProps) {
  const { isLocalized } = useLanguageStore();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    try {
      await writeClipboardText("python app/backend/main.py");
      setCopied(true);
      const COPY_RESET_DELAY_MS = 2000;
      setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
    } catch (_error) {
      // Clipboard write failed - user may need to copy manually
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <Card className="mx-auto w-full max-w-md border-destructive/20 bg-card">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Server className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="font-semibold text-foreground text-lg">
              {i18n.getMessage("backend_connection_error_title", isLocalized)}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {i18n.getMessage(
                "backend_connection_error_description",
                isLocalized
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-2 font-medium text-foreground text-sm">
              {i18n.getMessage(
                "backend_connection_error_instructions",
                isLocalized
              )}
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
              <code className="flex-1 font-mono text-foreground text-sm">
                python app/backend/main.py
              </code>
              <Button
                className="h-auto p-1 text-xs"
                onClick={copyToClipboard}
                size="sm"
                variant="ghost"
              >
                {copied ? "✓" : "📋"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {i18n.getMessage(
                "backend_connection_ensure_localhost",
                isLocalized
              )}
            </span>
          </div>

          <Button
            className="w-full"
            disabled={isRetrying}
            onClick={onRetry}
            size="lg"
          >
            {isRetrying ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {i18n.getMessage("backend_connection_checking", isLocalized)}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {i18n.getMessage("backend_connection_error_retry", isLocalized)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
