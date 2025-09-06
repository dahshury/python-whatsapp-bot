"use client";

import { BarChart3, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { buttonVariants } from "@/components/ui/button";
import { DockIcon } from "@/components/ui/dock";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavigationLinksProps } from "@/types/navigation";

export const NavigationLinks = React.memo(function NavigationLinks({
	isLocalized = false,
	className = "",
}: NavigationLinksProps) {
	const pathname = usePathname();
	const isDashboardActive = pathname?.startsWith("/dashboard") ?? false;
	return (
		<>
			<DockIcon>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link
							href="/dashboard"
							aria-label={isLocalized ? "لوحة التحكم" : "Dashboard"}
							className={cn(
								buttonVariants({
									variant: isDashboardActive ? "default" : "ghost",
									size: "icon",
								}),
								"size-9 rounded-full transition-all duration-200",
								isDashboardActive && "shadow-lg",
								className,
							)}
						>
							<BarChart3 className="size-4" />
						</Link>
					</TooltipTrigger>
					<TooltipContent>
						<p>{isLocalized ? "لوحة التحكم" : "Dashboard"}</p>
					</TooltipContent>
				</Tooltip>
			</DockIcon>

			<Separator orientation="vertical" className="h-full py-2" />
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
				aria-label={isLocalized ? "التقويم" : "Calendar"}
				className={cn(
					buttonVariants({
						variant: "ghost",
						size: "icon",
					}),
					"size-9 rounded-full transition-all duration-200",
					className,
				)}
			>
				<Calendar className="size-4" />
			</Link>
		</DockIcon>
	);
});
