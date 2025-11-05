"use client";

import type React from "react";
import { QueryWrapper } from "./QueryWrapper";

export const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryWrapper>{children}</QueryWrapper>
);
