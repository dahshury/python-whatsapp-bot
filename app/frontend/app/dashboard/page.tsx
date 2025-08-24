"use client";

import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardView } from "@/components/dashboard-view";
import { DockNav } from "@/components/dock-nav";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardPage() {
	return (
		<SidebarInset>
			<header className="relative flex h-16 shrink-0 items-center justify-center border-b px-4">
				<SidebarTrigger className="absolute left-4" />
				<DockNav className="mt-0" />
			</header>
			<div className="flex flex-1 flex-col gap-4 p-4">
				<Suspense fallback={<DashboardSkeleton />}>
					<DashboardView />
				</Suspense>
			</div>
		</SidebarInset>
	);
}
