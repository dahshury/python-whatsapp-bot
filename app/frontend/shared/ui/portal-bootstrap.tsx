"use client";

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
        zIndex: "var(--z-dialog-overlay-portal, 720)",
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
