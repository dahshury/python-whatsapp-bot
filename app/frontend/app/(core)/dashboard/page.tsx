"use client";

import { DashboardSkeleton } from "@features/dashboard/dashboard-skeleton";
import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { SidebarInset, useSidebar } from "@/shared/ui/sidebar";

const DashboardView = dynamic(
	() =>
		import("@/features/dashboard/dashboard-view").then((m) => m.DashboardView),
	{
		ssr: false,
		loading: () => <DashboardSkeleton />,
	}
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
		} catch {
			// Sidebar state management may not be available in all contexts
		}
	}, [setOpen, setOpenMobile]);
	return (
		<SidebarInset>
			<div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
				<div className="mx-auto w-full max-w-7xl">
					<Suspense fallback={<DashboardSkeleton />}>
						<DashboardView />
					</Suspense>
				</div>
			</div>
		</SidebarInset>
	);
}
