"use client";

import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import type * as React from "react";
import { useRippleEffect } from "./use-ripple-effect";

/**
 * HomeButton Component
 *
 * Premium glass-morphism home link with t0ggles icon.
 * Uses the T0 design system styling.
 */

interface HomeButtonProps extends React.ComponentProps<"a"> {
	href?: string;
}

function BaseHomeButton({ href = "/", className, ...props }: HomeButtonProps) {
	const { rippleHandlers, rippleStyle, rippleContainerStyle } = useRippleEffect(
		{
			rippleOpacity: 0.15,
			transitionDuration: 300,
		}
	);

	return (
		<a
			aria-label="Home page"
			className={cn(
				"t0-surface-level-2 t0-button group/button relative flex h-10 w-10 shrink-0 cursor-pointer select-none appearance-none rounded-full text-left text-t0-on-surface focus:outline-0 focus:ring-0",
				className
			)}
			href={href}
			{...rippleHandlers}
			{...props}
		>
			{/* Outer gradient border effect */}
			<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-full border-2 border-t0-surface-border bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface shadow-t0-surface-raised" />

			{/* Inner highlight gradient */}
			<div className="pointer-events-none absolute top-[3px] right-[3px] bottom-[3px] left-[3px] rounded-full bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface">
				{/* Hover and active state overlay */}
				<div className="absolute inset-0 rounded-full bg-gradient-to-br from-t0-surface-black/[0.5] via-t0-surface-black/0 to-t0-surface-white/[0.1] opacity-0 transition-opacity duration-200 group-hover/button:opacity-50 group-active/button:opacity-100" />
			</div>

			{/* Icon content wrapper */}
			<div className="relative flex h-full w-full items-center justify-center gap-1.5 py-1 font-semibold text-sm transition-[transform,opacity,scale] duration-200 group-active/button:scale-95 group-active/button:opacity-75">
				<svg
					aria-labelledby="homeButtonTitle"
					className="h-6 w-6 text-primary"
					fill="none"
					height="512"
					role="img"
					viewBox="0 0 512 512"
					width="512"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title id="homeButtonTitle">Home</title>
					<path
						clipRule="evenodd"
						d="M216.17 320.356V191.644C216.17 152.424 184.468 120.63 145.362 120.63C106.255 120.63 74.5532 152.424 74.5532 191.644V320.356C74.5532 359.576 106.255 391.37 145.362 391.37C184.468 391.37 216.17 359.576 216.17 320.356ZM145.362 94C91.5903 94 48 137.717 48 191.644V320.356C48 374.283 91.5903 418 145.362 418C199.133 418 242.723 374.283 242.723 320.356V191.644C242.723 137.717 199.133 94 145.362 94Z"
						fill="currentColor"
						fillRule="evenodd"
					/>
					<path
						d="M194.043 256C194.043 282.964 172.247 304.822 145.362 304.822C118.476 304.822 96.6809 282.964 96.6809 256C96.6809 229.036 118.476 207.178 145.362 207.178C172.247 207.178 194.043 229.036 194.043 256Z"
						fill="currentColor"
					/>
					<path
						d="M437.447 320.356V191.644C437.447 152.424 405.745 120.63 366.638 120.63C327.532 120.63 295.83 152.424 295.83 191.644V256H269.277V191.644C269.277 137.717 312.867 94 366.638 94C420.41 94 464 137.717 464 191.644V320.356C464 374.283 420.41 418 366.638 418C340.766 418 317.251 407.879 299.814 391.37L318.577 372.507C331.202 384.215 348.087 391.37 366.638 391.37C405.745 391.37 437.447 359.576 437.447 320.356Z"
						fill="currentColor"
					/>
					<path
						d="M415.319 191.644C415.319 218.607 393.524 240.466 366.638 240.466C339.753 240.466 317.957 218.607 317.957 191.644C317.957 164.68 339.753 142.822 366.638 142.822C393.524 142.822 415.319 164.68 415.319 191.644Z"
						fill="currentColor"
					/>
				</svg>
			</div>

			{/* Ripple effect */}
			<span
				className="rounded-full"
				style={{
					...rippleContainerStyle,
					inset: "3px",
				}}
			>
				<span style={rippleStyle} />
			</span>
		</a>
	);
}

export function HomeButton(props: HomeButtonProps) {
	const Override = useUiOverride<HomeButtonProps>("HomeButton", BaseHomeButton);
	return <Override {...props} />;
}

/**
 * ProductMenuButton Component
 *
 * Mobile-only product menu button with dropdown indicator.
 * Visible on small screens only (sm:hidden).
 */

interface ProductMenuButtonProps extends React.ComponentProps<"button"> {
	children?: React.ReactNode;
}

function BaseProductMenuButton({
	children = "Product",
	className,
	...props
}: ProductMenuButtonProps) {
	const { rippleHandlers, rippleStyle, rippleContainerStyle } = useRippleEffect(
		{
			rippleOpacity: 0.15,
			transitionDuration: 300,
		}
	);

	return (
		<button
			aria-label="Product menu"
			className={cn(
				"t0-surface-level-2 t0-button group/button relative h-10 min-w-10 shrink cursor-auto select-none appearance-none rounded-full text-left text-t0-on-surface focus:outline-0 focus:ring-0 sm:hidden",
				className
			)}
			type="button"
			{...rippleHandlers}
			{...props}
		>
			{/* Outer gradient border effect */}
			<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-full border-2 border-t0-surface-border bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface shadow-t0-surface-raised" />

			{/* Inner highlight gradient */}
			<div className="pointer-events-none absolute top-[3px] right-[3px] bottom-[3px] left-[3px] rounded-full bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface">
				{/* Hover and active state overlay */}
				<div className="absolute inset-0 rounded-full bg-gradient-to-br from-t0-surface-black/[0.5] via-t0-surface-black/0 to-t0-surface-white/[0.1] opacity-0 transition-opacity duration-200 group-hover/button:opacity-50 group-active/button:opacity-100" />
			</div>

			{/* Content */}
			<div className="relative flex h-full w-full items-center justify-center gap-1 py-1 pr-2 pl-4 font-semibold text-sm transition-[transform,opacity,scale] duration-200 group-active/button:scale-95 group-active/button:opacity-75">
				<span className="min-w-0 shrink overflow-hidden text-ellipsis">
					{children}
				</span>
				<svg
					aria-labelledby="productMenuChevronTitle"
					className="h-5 w-5 shrink-0 text-t0-on-surface-darker"
					fill="currentColor"
					height="24"
					role="img"
					viewBox="0 -960 960 960"
					width="24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title id="productMenuChevronTitle">Open menu</title>
					<path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" />
				</svg>
			</div>

			{/* Ripple effect */}
			<span
				className="rounded-full"
				style={{
					...rippleContainerStyle,
					inset: "3px",
				}}
			>
				<span style={rippleStyle} />
			</span>
		</button>
	);
}

export function ProductMenuButton(props: ProductMenuButtonProps) {
	const Override = useUiOverride<ProductMenuButtonProps>(
		"ProductMenuButton",
		BaseProductMenuButton
	);
	return <Override {...props} />;
}
