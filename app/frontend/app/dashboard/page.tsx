"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";

const DashboardView = dynamic(
	() => import("@/components/dashboard-view").then((m) => m.DashboardView),
	{ ssr: false, loading: () => <DashboardSkeleton /> },
);

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
			<div className="flex flex-1 flex-col gap-4 p-4">
				<Suspense fallback={<DashboardSkeleton />}>
					<DashboardView />
				</Suspense>
			</div>
		</SidebarInset>
	);
}
