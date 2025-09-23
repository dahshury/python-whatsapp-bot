"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";

export function ConditionalAppSidebar() {
	const pathname = usePathname();
	const isDashboardPage = pathname?.startsWith("/dashboard") ?? false;
	if (isDashboardPage) return null;
	return <AppSidebar />;
}
