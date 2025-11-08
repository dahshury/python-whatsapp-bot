"use client";

import React from "react";
import { toast as sonner } from "sonner";

import { i18n } from "@shared/libs/i18n";
import { DEFAULT_TOAST_DURATION_MS } from "../constants";

export function themed(
  title: string,
  subtitle?: string,
  duration = DEFAULT_TOAST_DURATION_MS
) {
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
              "button",
              {
                type: "button",
                className:
                  "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
                onClick: () => {
                  try {
                    sonner.dismiss(id);
                  } catch {
                    // ignore
                  }
                },
              },
              dismissLabel
            )
          )
        )
      ),
    { duration }
  );
}
