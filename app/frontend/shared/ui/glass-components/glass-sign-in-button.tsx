"use client";

import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import type * as React from "react";

/**
 * GlassSignInButton Component
 *
 * Recreates the premium glass-morphism button element from external website.
 * Uses the T0 design system with gradient surfaces and depth effects.
 *
 * Features:
 * - Gradient border effects (surface-edge to surface)
 * - Inner highlight layer (surface-highlight to surface)
 * - Active state animations (scale and opacity)
 * - Two-level surface system for depth
 * - Hover effects with visual feedback
 */

interface GlassSignInButtonProps extends React.ComponentProps<"button"> {
	children?: React.ReactNode;
}

function BaseGlassSignInButton({
	children = "Sign In",
	className,
	...props
}: GlassSignInButtonProps) {
	return (
		<div
			className={cn(
				"t0-surface-level-1 group/button relative h-12 min-w-0 shrink rounded-full text-t0-on-surface",
				className
			)}
		>
			{/* Outer gradient border effect */}
			<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-full bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface transition-opacity duration-200 group-hover/button:opacity-80" />

			{/* Inner highlight gradient */}
			<div className="pointer-events-none absolute top-px right-px bottom-px left-px rounded-full bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface transition-opacity duration-200 group-hover/button:opacity-100" />

			{/* Content wrapper */}
			<div className="relative flex h-full items-center gap-1 xs:gap-2 p-1">
				<div className="relative flex min-w-0 flex-1">
					<button
						aria-label={
							typeof children === "string" ? children : "Account menu"
						}
						className={cn(
							"group/button-inner relative h-10 min-w-0 cursor-pointer select-none appearance-none rounded-full bg-t0-surface-level-2 text-left text-t0-on-surface transition-all duration-200 focus:outline-0 focus:ring-0 group-hover/button:text-t0-on-surface-dark",
							"border border-t0-surface-border shadow-sm group-hover/button:border-t0-on-surface-darker group-hover/button:shadow-lg"
						)}
						type="button"
						{...props}
					>
						{/* Outer button gradient */}
						<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-full border-2 border-t0-surface-border bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface shadow-t0-surface-raised transition-opacity duration-200 group-hover/button:opacity-90" />

						{/* Inner button highlight */}
						<div className="pointer-events-none absolute top-[3px] right-[3px] bottom-[3px] left-[3px] rounded-full bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface transition-opacity duration-200 group-hover/button:opacity-100">
							{/* Active state overlay */}
							<div className="absolute inset-0 rounded-full bg-gradient-to-br from-t0-surface-black/[0.5] via-t0-surface-black/0 to-t0-surface-white/[0.1] opacity-0 duration-200 group-hover/button:opacity-50 group-active/button:opacity-100" />
						</div>

						{/* Button content */}
						<div className="relative flex h-full w-full items-center justify-center gap-1 px-4 xs:px-6 py-1 font-semibold text-sm transition-[transform,opacity,scale] duration-200 group-hover/button:scale-100 group-active/button:scale-95 group-active/button:opacity-75">
							<span>{children}</span>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
}

export function GlassSignInButton(props: GlassSignInButtonProps) {
	const Override = useUiOverride<GlassSignInButtonProps>(
		"GlassSignInButton",
		BaseGlassSignInButton
	);
	return <Override {...props} />;
}
