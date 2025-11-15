"use client";

import { cn } from "@/shared/libs/utils";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

type ConfigPageShellProps = {
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
};

export const ConfigPageShell = ({
  isLoading,
  isError,
  onRetry,
  children,
  className,
}: ConfigPageShellProps) => {
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
        <div>
          <p className="font-semibold text-lg">Failed to load configuration</p>
          <p className="text-muted-foreground">
            Please check your connection and try again.
          </p>
        </div>
        {onRetry ? (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("w-full bg-background", className)}>
      <div className="container mx-auto max-w-6xl space-y-6 p-6 pb-12">
        {children}
      </div>
    </div>
  );
};
