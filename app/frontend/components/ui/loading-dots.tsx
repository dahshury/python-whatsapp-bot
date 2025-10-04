"use client";

import type * as React from "react";

interface LoadingDotsProps {
	size?: number;
	children?: React.ReactNode;
}

const dots: Array<{ animationDelay: string; marginLeft?: number }> = [
	{ animationDelay: "0s" },
	{ animationDelay: "0.2s", marginLeft: 1 },
	{ animationDelay: "0.4s", marginLeft: 1 },
];

export const LoadingDots: React.FC<LoadingDotsProps> = ({
	size = 2,
	children,
}) => {
	return (
		<span className="inline-flex items-center">
			{children && <div className="mr-3">{children}</div>}
			{dots.map((dot) => (
				<span
					key={dot.animationDelay}
					className="bg-gray-900 inline-block rounded-[50%] animate-loading"
					style={{ height: size, width: size, ...dot }}
				/>
			))}
		</span>
	);
};
