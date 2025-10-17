"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/features/navigation/app-sidebar";

export function ConditionalAppSidebar() {
	const pathname = usePathname();
	const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
	const isDocumentsPage = pathname === "/documents";
	if (isDashboardPage || isDocumentsPage) {
		return null;
	}
	return <AppSidebar />;
}
