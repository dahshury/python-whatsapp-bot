"use client";

import { Suspense, useEffect } from "react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { DashboardView } from "@/components/dashboard-view";
import { DockNav } from "@/components/dock-nav";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";

export default function DashboardPage() {
	const { setOpen, setOpenMobile } = useSidebar();
	// Ensure any sidebar state from previous pages is closed on dashboard
	// so no offcanvas/sidebar UI remains visible here
	// Close both desktop and mobile sidebars on mount
	useEffect(() => {
		try {
			setOpen(false);
			setOpenMobile(false);
		} catch {}
	}, [setOpen, setOpenMobile]);
	return (
		<SidebarInset>
			<header className="relative flex h-10 shrink-0 items-center justify-center border-b px-3">
				<DockNav className="mt-0 min-h-[2.25rem]" />
			</header>
			<div className="flex flex-1 flex-col gap-4 p-4">
				<Suspense fallback={<DashboardSkeleton />}>
					<DashboardView />
				</Suspense>
			</div>
		</SidebarInset>
	);
}
