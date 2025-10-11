"use client";

import type { NavigationLinksProps } from "@features/navigation/types";
import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { buttonVariants } from "@ui/button";
import { BarChart3, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { DockIcon } from "@/shared/ui/dock";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export const NavigationLinks = React.memo(function NavigationLinks({
	isLocalized = false,
	className = "",
}: NavigationLinksProps) {
	const pathname = usePathname();
	const isDashboardActive = pathname?.startsWith("/dashboard") ?? false;
	const isDocumentsActive = pathname?.startsWith("/documents") ?? false;
	return (
		<>
			{/* Order: Calendar (handled separately), then Documents, then Dashboard */}
			<DockIcon>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href="/documents"
							aria-label={i18n.getMessage("documents", isLocalized)}
							className={cn(
								buttonVariants({
									variant: isDocumentsActive ? "default" : "ghost",
									size: "icon",
								}),
								"size-9 sm:size-10 rounded-full transition-all duration-200",
								isDocumentsActive && "shadow-lg",
								className
							)}
							data-slot="sidebar-menu-button"
							data-active={isDocumentsActive}
						>
							<FileText className="size-4 sm:size-5" />
						</Link>
					</TooltipTrigger>
					<TooltipContent>
						<p>{i18n.getMessage("documents", isLocalized)}</p>
					</TooltipContent>
				</Tooltip>
			</DockIcon>

			<DockIcon>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href="/dashboard"
							aria-label={i18n.getMessage("dashboard_title", isLocalized)}
							className={cn(
								buttonVariants({
									variant: isDashboardActive ? "default" : "ghost",
									size: "icon",
								}),
								"size-9 sm:size-10 rounded-full transition-all duration-200",
								isDashboardActive && "shadow-lg",
								className
							)}
							data-slot="sidebar-menu-button"
							data-active={isDashboardActive}
						>
							<BarChart3 className="size-4 sm:size-5" />
						</Link>
					</TooltipTrigger>
					<TooltipContent>
						<p>{i18n.getMessage("dashboard_title", isLocalized)}</p>
					</TooltipContent>
				</Tooltip>
			</DockIcon>
		</>
	);
});

export const CalendarLink = React.memo(function CalendarLink({
	isLocalized = false,
	className = "",
}: Pick<NavigationLinksProps, "isLocalized" | "className">) {
	return (
		<DockIcon>
			<Link
				href="/"
				prefetch={false}
				aria-label={i18n.getMessage("calendar", isLocalized)}
				className={cn(
					buttonVariants({
						variant: "ghost",
						size: "icon",
					}),
					"size-9 rounded-full transition-all duration-200",
					className
				)}
			>
				<Calendar className="size-4" />
			</Link>
		</DockIcon>
	);
});
