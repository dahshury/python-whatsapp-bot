"use client";

import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import type * as React from "react";
import { HomeButton, ProductMenuButton } from "./navigation-buttons";
import { useRippleEffect } from "./use-ripple-effect";

/**
 * SegmentedNavLink Component
 *
 * Individual link for segmented navigation with glass morphism styling.
 */

interface SegmentedNavLinkProps extends React.ComponentProps<"a"> {
	children?: React.ReactNode;
	isFirst?: boolean;
	isLast?: boolean;
}

function BaseSegmentedNavLink({
	children,
	isFirst = false,
	isLast = false,
	className,
	href = "#",
	...props
}: SegmentedNavLinkProps) {
	const { rippleHandlers, rippleStyle, rippleContainerStyle } = useRippleEffect(
		{
			rippleOpacity: 0.1,
			transitionDuration: 300,
		}
	);

	let borderRadius = "";
	if (isFirst) {
		borderRadius = "rounded-l-full";
	} else if (isLast) {
		borderRadius = "rounded-r-full";
	}

	return (
		<a
			className={cn(
				"t0-surface-level-2 t0-segmented-button group/button relative h-full cursor-pointer select-none text-t0-on-surface focus:outline-0 focus:ring-0",
				borderRadius,
				className
			)}
			href={href}
			{...rippleHandlers}
			{...props}
		>
			{/* Hover and active state overlay with depth effect */}
			<div
				className={cn(
					"pointer-events-none absolute top-0 left-0 h-full w-full",
					borderRadius
				)}
			>
				<div
					className={cn(
						"absolute inset-0 bg-gradient-to-br from-t0-surface-black/[0.5] via-t0-surface-black/0 to-t0-surface-white/[0.1] opacity-0 transition-opacity duration-200 group-active/button:opacity-100",
						borderRadius
					)}
				/>
			</div>

			{/* Divider */}
			<span
				className={cn(
					"absolute top-0 left-0 h-full w-px bg-t0-surface-outline group-first/button:hidden"
				)}
			/>

			{/* Content with transition effects */}
			<div className="relative flex h-full items-center justify-center gap-1 px-6 font-semibold text-sm transition-[transform,opacity,scale] duration-200 group-active/button:scale-95 group-active/button:opacity-75">
				{children}
			</div>

			{/* Ripple effect */}
			<span
				className={borderRadius}
				style={{
					...rippleContainerStyle,
					inset: "0px",
				}}
			>
				<span style={rippleStyle} />
			</span>
		</a>
	);
}

function SegmentedNavLink(props: SegmentedNavLinkProps) {
	const Override = useUiOverride<SegmentedNavLinkProps>(
		"SegmentedNavLink",
		BaseSegmentedNavLink
	);
	return <Override {...props} />;
}

/**
 * SegmentedNav Component
 *
 * Desktop-only segmented navigation with glass morphism styling.
 * Visible on small screens only (hidden sm:flex).
 */

interface SegmentedNavProps extends React.ComponentProps<"div"> {
	items?: Array<{ href: string; label: string }>;
}

function BaseSegmentedNav({
	items = [
		{ href: "/docs/", label: "Documentation" },
		{ href: "/blog/", label: "Blog" },
	],
	className,
	...props
}: SegmentedNavProps) {
	return (
		<div
			className={cn(
				"t0-surface-level-2 t0-segmented group/segmented relative hidden h-10 rounded-full p-0.5 text-t0-on-surface sm:flex",
				className
			)}
			{...props}
		>
			{/* Outer container gradient - depth layer */}
			<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-full border-2 border-t0-surface-border bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface shadow-t0-surface-raised" />

			{/* Inner highlight gradient - light reflection */}
			<div className="pointer-events-none absolute top-[3px] right-[3px] bottom-[3px] left-[3px] rounded-full bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface" />

			{/* Navigation items container */}
			<div className="relative flex h-full items-center justify-center divide-x divide-t0-surface-border overflow-hidden rounded-full">
				{items.map((item, index) => (
					<SegmentedNavLink
						className={cn(
							index === 0 ? "rounded-l-full" : "",
							index === items.length - 1 ? "rounded-r-full" : ""
						)}
						href={item.href}
						isFirst={index === 0}
						isLast={index === items.length - 1}
						key={item.href}
					>
						{item.label}
					</SegmentedNavLink>
				))}
			</div>
		</div>
	);
}

export function SegmentedNav(props: SegmentedNavProps) {
	const Override = useUiOverride<SegmentedNavProps>(
		"SegmentedNav",
		BaseSegmentedNav
	);
	return <Override {...props} />;
}

/**
 * NavigationBar Component
 *
 * Complete navigation bar combining home button, product menu, and segmented nav.
 */

interface NavigationBarProps extends React.ComponentProps<"div"> {
	homeHref?: string;
	navItems?: Array<{ href: string; label: string }>;
	onProductMenuClick?: () => void;
}

function BaseNavigationBar({
	homeHref = "/",
	navItems = [
		{ href: "/docs/", label: "Documentation" },
		{ href: "/blog/", label: "Blog" },
	],
	onProductMenuClick,
	className,
	...props
}: NavigationBarProps) {
	return (
		<div className={cn("relative flex h-full gap-1 p-1", className)} {...props}>
			<HomeButton href={homeHref} />
			<ProductMenuButton onClick={onProductMenuClick} />
			<SegmentedNav items={navItems} />
		</div>
	);
}

export function NavigationBar(props: NavigationBarProps) {
	const Override = useUiOverride<NavigationBarProps>(
		"NavigationBar",
		BaseNavigationBar
	);
	return <Override {...props} />;
}
