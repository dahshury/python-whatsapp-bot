"use client";

import { Z_INDEX } from "@shared/libs/ui/z-index";
import { useEffect } from "react";

export function PortalBootstrap(): null {
  useEffect(() => {
    try {
      const body = document.body;
      if (!body) {
        return;
      }

      // Ensure dialog overlay portal exists
      let dialog = document.getElementById(
        "dialog-overlay-portal"
      ) as HTMLDivElement | null;
      if (!dialog) {
        dialog = document.createElement("div");
        dialog.id = "dialog-overlay-portal";
      }
      Object.assign(dialog.style, {
        position: "fixed",
        top: "0px",
        left: "0px",
        pointerEvents: "none",
        zIndex: String(
          Z_INDEX.DIALOG_OVERLAY_PORTAL ??
            (() => {
              const DEFAULT_DIALOG_Z_INDEX = 1000;
              return DEFAULT_DIALOG_Z_INDEX;
            })()
        ),
        width: "0px",
        height: "0px",
      } as Partial<CSSStyleDeclaration>);
      if (!dialog.isConnected) {
        body.appendChild(dialog);
      }

      // Ensure Glide overlay editor portal exists and is the last child of body
      let portal = document.getElementById("portal") as HTMLDivElement | null;
      if (!portal) {
        portal = document.createElement("div");
        portal.id = "portal";
      }
      // Append (or move) as last child
      body.appendChild(portal);
    } catch {
      // Ignore errors during portal initialization - non-critical
    }
  }, []);

  return null;
}
