"use client";

import { useUiOverride } from "@shared/libs/ui-registry";
import { cn } from "@shared/libs/utils";
import Image from "next/image";
import type * as React from "react";

/**
 * ProjectCard Component
 *
 * Premium glass-morphism project card with image, title, and description.
 * Features hover effects with external link icon.
 */

interface ProjectCardProps extends React.ComponentProps<"a"> {
	image?: string;
	imageAlt?: string;
	title?: string;
	description?: string;
	href?: string;
}

function BaseProjectCard({
	image = "/assets/demo/boards/viva-metric/viva-metric-logo.png",
	imageAlt = "Demo board logo",
	title = "Viva Metric",
	description = "Health monitor app development",
	href = "#",
	className,
	...props
}: ProjectCardProps) {
	return (
		<a
			className={cn(
				"group/board-card relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl p-4 text-color-on-surface-website transition-all duration-200 md:p-8",
				"t0-surface-level-1 border border-t0-surface-border group-hover/board-card:border-t0-on-surface-darker group-hover/board-card:shadow-lg",
				className
			)}
			href={href}
			{...props}
		>
			{/* Outer gradient border effect */}
			<div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 rounded-2xl bg-gradient-to-br from-t0-surface-edge to-50% to-t0-surface transition-opacity duration-200 group-hover/board-card:opacity-80" />

			{/* Inner highlight gradient */}
			<div className="pointer-events-none absolute top-px right-px bottom-px left-px rounded-2xl bg-gradient-to-br from-t0-surface-highlight to-50% to-t0-surface transition-opacity duration-200 group-hover/board-card:opacity-100" />

			{/* Content wrapper - relative z-index to sit above gradients */}
			<div className="relative z-10 flex h-full flex-col gap-4">
				{/* Project Image */}
				{image && (
					<Image
						alt={imageAlt}
						className="mb-2 h-28 w-28 rounded-2xl object-cover outline outline-2 outline-white/10 transition-transform duration-200 group-hover/board-card:scale-105"
						height={112}
						src={image}
						width={112}
					/>
				)}

				{/* Title */}
				{title && (
					<h4 className="flex gap-4 font-semibold text-color-on-surface-website leading-tight">
						{title}
					</h4>
				)}

				{/* Description */}
				{description && (
					<div className="font-medium text-color-on-surface-website-darker">
						{description}
					</div>
				)}
			</div>

			{/* External Link Icon */}
			<svg
				aria-labelledby="projectCardExternalLinkTitle"
				className="absolute top-4 right-4 opacity-30 transition-opacity duration-200 group-hover/board-card:opacity-100"
				fill="currentColor"
				height="24"
				role="img"
				viewBox="0 -960 960 960"
				width="24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title id="projectCardExternalLinkTitle">Open external link</title>
				<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z" />
			</svg>
		</a>
	);
}

export function ProjectCard(props: ProjectCardProps) {
	const Override = useUiOverride<ProjectCardProps>(
		"ProjectCard",
		BaseProjectCard
	);
	return <Override {...props} />;
}
