"use client";

import React from "react";
import { toast as sonner } from "sonner";
import { Undo2, X } from "lucide-react";

import { ButtonGroup } from "@/shared/ui/button-group";
import { i18n } from "@shared/libs/i18n";
import { UNDOABLE_TOAST_DURATION_MS } from "../constants";

export type ThemedUndoableOptions = {
  title: string;
  subtitle: string | undefined;
  actionLabel: string;
  onClick: () => void;
  duration?: number;
};

export function themedUndoable({
  title,
  subtitle,
  actionLabel,
  onClick,
  duration = UNDOABLE_TOAST_DURATION_MS,
}: ThemedUndoableOptions) {
  const dismissLabel = i18n.getMessage("toast_dismiss");

  sonner.custom(
    (id) =>
      React.createElement(
        "div",
        { className: "sonner-description fancy-toast" },
        React.createElement("div", { className: "fancy-toast-bg" }),
        React.createElement(
          "div",
          {
            className:
              "fancy-toast-content flex items-center justify-between gap-4",
          },
          React.createElement(
            "div",
            { className: "flex flex-col gap-0.5" },
            React.createElement(
              "div",
              { className: "fancy-toast-title" },
              title
            ),
            subtitle
              ? React.createElement(
                  "div",
                  { className: "fancy-toast-sub" },
                  subtitle
                )
              : null
          ),
          React.createElement(
            "div",
            { className: "flex shrink-0 gap-2" },
            React.createElement(
              ButtonGroup,
              { className: "ml-auto" },
              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "inline-flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  onClick: () => {
                    try {
                      onClick();
                    } finally {
                      try {
                        sonner.dismiss(id);
                      } catch {
                        /* ignore */
                      }
                    }
                  },
                },
                React.createElement(Undo2, { className: "h-3 w-3" }),
                React.createElement("span", null, actionLabel)
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "inline-flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  onClick: () => {
                    try {
                      sonner.dismiss(id);
                    } catch {
                      /* ignore */
                    }
                  },
                },
                React.createElement(X, { className: "h-3 w-3" }),
                React.createElement("span", null, dismissLabel)
              )
            )
          )
        )
      ),
    { duration }
  );
}
