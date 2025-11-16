"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import {
  Bold as BoldIcon,
  Code as CodeIcon,
  Italic as ItalicIcon,
  Strikethrough as StrikethroughIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

export type EditorLike = {
  isActive: (name: string) => boolean;
  can: () => {
    chain: () => {
      focus: () => {
        toggleBold: () => { run: () => boolean };
        toggleItalic: () => { run: () => boolean };
        toggleStrike: () => { run: () => boolean };
        toggleCode: () => { run: () => boolean };
      };
    };
  };
  chain: () => {
    focus: () => {
      toggleBold: () => { run: () => void };
      toggleItalic: () => { run: () => void };
      toggleStrike: () => { run: () => void };
      toggleCode: () => { run: () => void };
    };
  };
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
};

export function ChatFormatToolbar({
  editor,
  disabled,
  isLocalized,
  className,
}: {
  editor: EditorLike | null | undefined;
  disabled: boolean;
  isLocalized?: boolean;
  className?: string;
}) {
  const [activeMarks, setActiveMarks] = useState({
    bold: false,
    italic: false,
    strike: false,
    code: false,
  });

  // Update active marks when editor selection or content changes
  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateActiveMarks = () => {
      setActiveMarks({
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        strike: editor.isActive("strike"),
        code: editor.isActive("code"),
      });
    };

    // Initial update
    updateActiveMarks();

    // Listen to all editor events that might change the selection or marks
    editor.on("update", updateActiveMarks);
    editor.on("selectionUpdate", updateActiveMarks);
    editor.on("transaction", updateActiveMarks);
    editor.on("focus", updateActiveMarks);
    editor.on("blur", updateActiveMarks);

    return () => {
      try {
        editor.off("update", updateActiveMarks);
        editor.off("selectionUpdate", updateActiveMarks);
        editor.off("transaction", updateActiveMarks);
        editor.off("focus", updateActiveMarks);
        editor.off("blur", updateActiveMarks);
      } catch {
        // Editor cleanup errors are non-critical
      }
    };
  }, [editor]);
  const applyWrap = (marker: "*" | "_" | "~" | "`") => {
    if (!editor) {
      return;
    }
    const chain = editor.chain().focus();
    if (marker === "*") {
      chain.toggleBold().run();
    } else if (marker === "_") {
      chain.toggleItalic().run();
    } else if (marker === "~") {
      chain.toggleStrike().run();
    } else if (marker === "`") {
      chain.toggleCode().run();
    }
  };

  const isDisabled = (canRun: boolean) => disabled || !canRun;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {(() => {
        const isActive = activeMarks.bold;
        const canRun = !!editor?.can().chain().focus().toggleBold().run();
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded transition-all duration-200 disabled:opacity-50",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "icon-neon"
            )}
            disabled={isDisabled(canRun)}
            onMouseDown={(e) => {
              e.preventDefault();
              applyWrap("*");
            }}
            title={i18n.getMessage("chat_toolbar_bold", !!isLocalized)}
            type="button"
          >
            <BoldIcon className="h-3 w-3 transition-transform duration-200" />
          </button>
        );
      })()}
      {(() => {
        const isActive = activeMarks.italic;
        const canRun = !!editor?.can().chain().focus().toggleItalic().run();
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded transition-all duration-200 disabled:opacity-50",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "icon-neon"
            )}
            disabled={isDisabled(canRun)}
            onMouseDown={(e) => {
              e.preventDefault();
              applyWrap("_");
            }}
            title={i18n.getMessage("chat_toolbar_italic", !!isLocalized)}
            type="button"
          >
            <ItalicIcon className="h-3 w-3 transition-transform duration-200" />
          </button>
        );
      })()}
      {(() => {
        const isActive = activeMarks.strike;
        const canRun = !!editor?.can().chain().focus().toggleStrike().run();
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded transition-all duration-200 disabled:opacity-50",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "icon-neon"
            )}
            disabled={isDisabled(canRun)}
            onMouseDown={(e) => {
              e.preventDefault();
              applyWrap("~");
            }}
            title={i18n.getMessage("chat_toolbar_strike", !!isLocalized)}
            type="button"
          >
            <StrikethroughIcon className="h-3 w-3 transition-transform duration-200" />
          </button>
        );
      })()}
      {(() => {
        const isActive = activeMarks.code;
        const canRun = !!editor?.can().chain().focus().toggleCode().run();
        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded transition-all duration-200 disabled:opacity-50",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "icon-neon"
            )}
            disabled={isDisabled(canRun)}
            onMouseDown={(e) => {
              e.preventDefault();
              applyWrap("`");
            }}
            title={i18n.getMessage("chat_toolbar_code", !!isLocalized)}
            type="button"
          >
            <CodeIcon className="h-3 w-3 transition-transform duration-200" />
          </button>
        );
      })()}
    </div>
  );
}
