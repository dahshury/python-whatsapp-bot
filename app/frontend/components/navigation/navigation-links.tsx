"use client";

import { BarChart3, Calendar } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function NavigationLinks({
	isRTL = false,
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
							aria-label={isRTL ? "لوحة التحكم" : "Dashboard"}
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
						<p>{isRTL ? "لوحة التحكم" : "Dashboard"}</p>
					</TooltipContent>
				</Tooltip>
			</DockIcon>

			<Separator orientation="vertical" className="h-full py-2" />
		</>
	);
}

export function CalendarLink({
	isRTL = false,
	className = "",
}: Pick<NavigationLinksProps, "isRTL" | "className">) {
	return (
		<DockIcon>
			<Link
				href="/"
				prefetch={false}
				aria-label={isRTL ? "التقويم" : "Calendar"}
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
}
