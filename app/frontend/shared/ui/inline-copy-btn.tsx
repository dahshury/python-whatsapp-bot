"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { type HTMLAttributes, useState } from "react";

interface InlineCopyBtnProps extends HTMLAttributes<HTMLButtonElement> {
  text: string;
  className?: string;
  isLocalized?: boolean;
}

export function InlineCopyBtn({
  text,
  className,
  isLocalized = false,
  ...props
}: InlineCopyBtnProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent button (collapsible trigger)
    const COPY_FEEDBACK_DURATION_MS = 2000;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
  };

  return (
    <Button
      aria-label={
        copied
          ? i18n.getMessage("copied", isLocalized)
          : i18n.getMessage("copy", isLocalized)
      }
      className={cn(
        "relative h-4 w-4 p-0 transition-colors duration-200 hover:bg-accent/50",
        className
      )}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      <span className="sr-only">
        {copied
          ? i18n.getMessage("copied", isLocalized)
          : i18n.getMessage("copy", isLocalized)}
      </span>
      <motion.div
        animate={{ scale: copied ? 0 : 1 }}
        className="flex items-center justify-center"
        initial={false}
        transition={{ duration: 0.2 }}
      >
        <Copy className="h-3 w-3" />
      </motion.div>
      <motion.div
        animate={{ scale: copied ? 1 : 0 }}
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        transition={{ duration: 0.2 }}
      >
        <Check className="h-3 w-3 text-green-500" />
      </motion.div>
    </Button>
  );
}
