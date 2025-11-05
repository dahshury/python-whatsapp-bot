"use client";

import type { Locale } from "./i18n-types";

export const getDirection = (locale: Locale): "ltr" | "rtl" =>
  locale === "ar" ? "rtl" : "ltr";

export const setDocumentDirection = (locale: Locale): void => {
  if (typeof document === "undefined") {
    return;
  }

  const direction = getDirection(locale);
  document.documentElement.dir = direction;
  document.documentElement.lang = locale;
  document.documentElement.setAttribute("dir", direction);
};

export const getRTLClass = (locale: Locale): string =>
  locale === "ar" ? "rtl" : "ltr";

export const getFlexDirection = (
  locale: Locale,
  ltr = "flex-row",
  rtl = "flex-row-reverse"
): string => (locale === "ar" ? rtl : ltr);

export const getTextAlign = (
  locale: Locale,
  fallback: "left" | "right" | "center" = "left"
): "left" | "right" | "center" => {
  if (fallback === "center") {
    return "center";
  }
  return locale === "ar" ? "right" : "left";
};

export const getMarginDirection = (
  locale: Locale,
  value: number,
  side: "start" | "end" = "start"
): { marginLeft?: number; marginRight?: number } => {
  if (locale === "ar") {
    return side === "start" ? { marginRight: value } : { marginLeft: value };
  }
  return side === "start" ? { marginLeft: value } : { marginRight: value };
};

export const getPaddingDirection = (
  locale: Locale,
  value: number,
  side: "start" | "end" = "start"
): { paddingLeft?: number; paddingRight?: number } => {
  if (locale === "ar") {
    return side === "start" ? { paddingRight: value } : { paddingLeft: value };
  }
  return side === "start" ? { paddingLeft: value } : { paddingRight: value };
};
