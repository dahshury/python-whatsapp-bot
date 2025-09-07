import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type React from "react";
import "./globals.css";
import "@glideapps/glide-data-grid/dist/index.css";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorRecoveryInit } from "@/components/error-recovery-init";
import { MainContentWrapper } from "@/components/main-content-wrapper";
import { SpacemanThemeBridge } from "@/components/theme/spaceman-theme-bridge";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { UndoManager } from "@/components/UndoManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { BackendConnectionProvider } from "@/lib/backend-connection-provider";
import { CustomerDataProvider } from "@/lib/customer-data-context";
import { LanguageProvider } from "@/lib/language-context";
import { RealtimeEventBus } from "@/lib/realtime-event-bus";
import { SettingsProvider } from "@/lib/settings-context";
import { ToastRouter } from "@/lib/toast-router";
import { UnifiedDataProvider } from "@/lib/unified-data-provider";
import { VacationProvider } from "@/lib/vacation-context";
import { WebSocketDataProvider } from "@/lib/websocket-data-provider";
import { Z_INDEX } from "@/lib/z-index";

// import { GlobalSettings } from "@/components/global-settings"

// Load Geist font for variable font support
const geist = localFont({
	src: "../app/fonts/GeistVF.woff",
	variable: "--font-geist",
	display: "swap",
	weight: "100 900",
});

const geistMono = localFont({
	src: "../app/fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
	display: "swap",
	weight: "100 900",
});

export const metadata: Metadata = {
	title: "Reservation Manager | WhatsApp Bot Dashboard",
	description:
		"Comprehensive reservation management system with WhatsApp integration, calendar scheduling, and real-time customer communication",
	keywords: [
		"reservations",
		"calendar",
		"WhatsApp",
		"booking",
		"scheduling",
		"appointments",
	],
	authors: [{ name: "Reservation Manager Team" }],
	icons: {
		icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
	},
	manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	themeColor: "#2563eb",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Favicon links for better browser compatibility */}
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link rel="icon" href="/favicon.svg" sizes="any" />
				<link rel="manifest" href="/site.webmanifest" />

				{/* Font optimization */}
				<link rel="dns-prefetch" href="//fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				{/* Preconnect to backend to speed up initial WebSocket handshake */}
				{process.env.NEXT_PUBLIC_WEBSOCKET_URL ? (
					<link
						rel="preconnect"
						href={(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "")
							.replace(/^wss?:/, "https:")
							.replace(/^ws:/, "http:")}
						crossOrigin="anonymous"
					/>
				) : null}
				{/* Removed missing console suppression script to avoid 404 */}
			</head>
			<body
				className={`${geist.variable} ${geistMono.variable} font-sans`}
				suppressHydrationWarning
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
					storageKey="ui-theme"
				>
					<ErrorRecoveryInit />
					<LanguageProvider>
						<SettingsProvider>
							<SpacemanThemeBridge>
								<BackendConnectionProvider>
									<WebSocketDataProvider>
										<UnifiedDataProvider>
											<ThemeWrapper>
												<VacationProvider>
													<CustomerDataProvider>
														<div className="flex flex-col h-screen">
															<div className="flex flex-1 overflow-hidden">
																<SidebarProvider>
																	<AppSidebar />
																	<MainContentWrapper>
																		{children}
																	</MainContentWrapper>
																</SidebarProvider>
															</div>
														</div>
														<RealtimeEventBus />
														<ToastRouter />
													</CustomerDataProvider>
												</VacationProvider>
												<UndoManager />
											</ThemeWrapper>
										</UnifiedDataProvider>
									</WebSocketDataProvider>
								</BackendConnectionProvider>
							</SpacemanThemeBridge>
						</SettingsProvider>
					</LanguageProvider>
					<Toaster
						position="bottom-right"
						gap={8}
						style={{
							zIndex: Z_INDEX.TOASTER,
						}}
						toastOptions={{
							className: "sonner-toast",
							descriptionClassName: "sonner-description",
							style: {
								background: "transparent",
								border: "none",
								// Don't set zIndex here - let Sonner handle individual toast stacking
								// Only expose z-index as CSS variable for the container
								// @ts-expect-error custom css var
								"--toaster-z": Z_INDEX.TOASTER,
							},
							classNames: {
								toast: "sonner-toast group",
								title: "sonner-title",
								description: "sonner-description",
								actionButton: "sonner-action",
								cancelButton: "sonner-cancel",
								closeButton: "sonner-close",
								error: "sonner-error",
								success: "sonner-success",
								warning: "sonner-warning",
								info: "sonner-info",
							},
						}}
					/>
				</ThemeProvider>
				{/* Required by Glide Data Grid overlay editor */}
				<div id="portal" />
				{/* Stable dialog overlay portal container */}
				<div
					id="dialog-overlay-portal"
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						pointerEvents: "none",
						zIndex: Z_INDEX.DIALOG_OVERLAY_PORTAL,
						width: 0,
						height: 0,
					}}
				/>
			</body>
		</html>
	);
}
