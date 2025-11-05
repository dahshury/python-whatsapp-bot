"use client";

import type * as React from "react";

type LoadingDotsProps = {
  size?: number;
  children?: React.ReactNode;
};

const dots: Array<{ animationDelay: string; marginLeft?: number }> = [
  { animationDelay: "0s" },
  { animationDelay: "0.2s", marginLeft: 1 },
  { animationDelay: "0.4s", marginLeft: 1 },
];

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 2,
  children,
}) => (
  <span className="inline-flex items-center">
    {children && <div className="mr-3">{children}</div>}
    {dots.map((dot) => (
      <span
        className="inline-block animate-loading rounded-[50%] bg-gray-900"
        key={dot.animationDelay}
        style={{ height: size, width: size, ...dot }}
      />
    ))}
  </span>
);
