import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type React from "react";
import "./globals.css";
import "@glideapps/glide-data-grid/dist/index.css";
import "@ncdai/react-wheel-picker/style.css";
import "@excalidraw/excalidraw/index.css";
import { CustomerDataProvider } from "@shared/libs/data/customer-data-context";
import { UnifiedDataProvider } from "@shared/libs/data/unified-data-provider";
import { WebSocketDataProvider } from "@shared/libs/data/websocket-data-provider";
import { DockBridgeProvider } from "@shared/libs/dock-bridge-context";
import { applyQueryDefaults } from "@shared/libs/query/query-defaults";
import { QueryHydration } from "@shared/libs/query/query-hydration";
import {
	prefetchConversationList,
	prefetchReservations,
} from "@shared/libs/query/query-prefetch";
import { QueryProvider } from "@shared/libs/query/query-provider";
import { LanguageProvider } from "@shared/libs/state/language-context";
import { SettingsProvider } from "@shared/libs/state/settings-context";
import { VacationProvider } from "@shared/libs/state/vacation-context";
import { ToastRouter } from "@shared/libs/toast/toast-router";
import { BackendConnectionOverlayBridge } from "@shared/libs/ui/backend-connection-overlay-bridge";
import { toIsoDate } from "@shared/libs/utils/date-utils";
import { DvhInit } from "@shared/ui/dvh-init";
import { ErrorRecoveryInit } from "@shared/ui/error-recovery-init";
import { MainContentWrapper } from "@shared/ui/main-content-wrapper";
import { ThemeWrapper } from "@shared/ui/theme-wrapper";
import { UndoManager } from "@shared/ui/undo-manager";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { ConditionalAppSidebar } from "@/features/navigation/conditional-app-sidebar";
import { PersistentDockHeader } from "@/features/navigation/persistent-dock-header";
import { THEME_OPTIONS } from "@/features/settings/settings/theme-data";
import { BackendConnectionProvider } from "@/shared/libs/backend-connection-provider";
import { RealtimeEventBus } from "@/shared/libs/realtime-event-bus";
import {
	ErrorBoundaryWrapper,
	RootErrorFallback,
} from "@/shared/ui/error-components";
import { PortalBootstrap } from "@/shared/ui/portal-bootstrap";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { SuppressExcalidrawWarnings } from "@/shared/ui/suppress-excalidraw-warnings";
import { SpacemanThemeBridge } from "@/shared/ui/theme/spaceman-theme-bridge";
import { UiThemeBridge } from "@/shared/ui/theme/ui-theme-bridge";
import { ThemeProvider } from "@/shared/ui/theme-provider";

// import { GlobalSettings } from "@/components/global-settings"

/**
 * Generates a safe theme initialization script that only allows specific theme classes
 */
function getThemeInitScript(): string {
	const allowedThemes = THEME_OPTIONS.map((t) => t.value);
	return `((function(){try{var t=localStorage.getItem('styleTheme');if(!t||!${JSON.stringify(
		allowedThemes
	)}.includes(t))return;var cl=document.documentElement.classList;for(var i=cl.length-1;i>=0;i--){var c=cl[i];if(c&&c.indexOf('theme-')===0){cl.remove(c)}}cl.add(t)}catch(e){}})());`;
}

function getWsBootstrapScript(): string {
	return `((function(){try{if(typeof window==='undefined')return;var w=window;var KEY='ws_tab_id_v1';var id=null;try{id=w.sessionStorage.getItem(KEY)}catch(_){}if(!id){id=Math.random().toString(36).slice(2)+'-'+Date.now().toString(36);try{w.sessionStorage.setItem(KEY,id)}catch(_){}}if(w.__wsInstance&&((w.__wsInstance.readyState===0)||(w.__wsInstance.readyState===1)))return;var isHttps=w.location.protocol==='https:';var host=w.location.hostname||'localhost';var proto=isHttps?'wss':'ws';var url=proto+'://'+host+':8000/ws?tab='+encodeURIComponent(id);var ws=new WebSocket(url);w.__wsInstance=ws;w.__wsConnectTs=Date.now()}catch(e){}})());`;
}

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
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	themeColor: "#2563eb",
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Server-side prefetch: conversations and reservations within ±5 days
	const client = new QueryClient();
	applyQueryDefaults(client);
	try {
		const now = new Date();
		const HOURS_PER_DAY = 24;
		const MINUTES_PER_HOUR = 60;
		const SECONDS_PER_MINUTE = 60;
		const MILLISECONDS_PER_SECOND = 1000;
		const DAYS_RANGE = 5; // Prefetch within ±5 days as requested
		const fiveDaysMs =
			DAYS_RANGE *
			HOURS_PER_DAY *
			MINUTES_PER_HOUR *
			SECONDS_PER_MINUTE *
			MILLISECONDS_PER_SECOND;
		const fromDate = toIsoDate(new Date(now.getTime() - fiveDaysMs));
		const toDate = toIsoDate(new Date(now.getTime() + fiveDaysMs));
		await Promise.all([
			prefetchConversationList(client, { fromDate, toDate }),
			prefetchReservations(client, { fromDate, toDate }),
		]);
	} catch {
		// Ignore prefetch errors to avoid blocking layout
	}
	const dehydratedState = dehydrate(client, {
		// Avoid hydrating queries that were still pending on the server
		// to prevent dev-only warnings when they later reject (e.g., cancellations).
		shouldDehydrateQuery: (q) => q.state.status === "success",
	});
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Favicon links for better browser compatibility */}
				<link href="/favicon.svg" rel="icon" type="image/svg+xml" />
				<link href="/favicon.svg" rel="icon" sizes="any" />
				<link href="/site.webmanifest" rel="manifest" />

				{/* Font optimization */}
				<link href="//fonts.googleapis.com" rel="dns-prefetch" />
				<link
					crossOrigin="anonymous"
					href="https://fonts.gstatic.com"
					rel="preconnect"
				/>
				{/* Preconnect to backend to speed up initial WebSocket handshake (localhost only) */}
				<link
					crossOrigin="anonymous"
					href="http://localhost:8000"
					rel="preconnect"
				/>
				{/* Apply saved style theme class before paint to prevent FOUC */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>This is safe as it only applies validated theme classes from localStorage</explanation>
					dangerouslySetInnerHTML={{
						__html: getThemeInitScript(),
					}}
				/>
				{/* Bootstrap WebSocket pre-hydration for instant reconnect on hard refresh */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>Pre-hydration bootstrap; script is self-contained and uses same-origin WS URL</explanation>
					dangerouslySetInnerHTML={{
						__html: getWsBootstrapScript(),
					}}
				/>
			</head>
			<body
				className={`${geist.variable} ${geistMono.variable} font-sans`}
				suppressHydrationWarning
			>
				<ErrorBoundaryWrapper
					component="RootLayout"
					fallback={RootErrorFallback}
					feature="root"
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						disableTransitionOnChange
						enableSystem
						storageKey="ui-theme"
					>
						<SuppressExcalidrawWarnings />
						<ErrorRecoveryInit />
						<LanguageProvider>
							<SettingsProvider>
								<UiThemeBridge>
									<SpacemanThemeBridge>
										<BackendConnectionProvider>
											<QueryProvider>
												<QueryHydration state={dehydratedState}>
													<WebSocketDataProvider>
														<UnifiedDataProvider>
															<ThemeWrapper>
																<VacationProvider>
																	<CustomerDataProvider>
																		<DockBridgeProvider>
																			<DvhInit />
																			<div
																				className="flex flex-col"
																				style={{
																					minHeight: "var(--doc-dvh, 100dvh)",
																				}}
																			>
																				<div className="flex flex-1 overflow-hidden">
																					<SidebarProvider>
																						<ConditionalAppSidebar />
																						<MainContentWrapper>
																							<PersistentDockHeader />
																							{children}
																						</MainContentWrapper>
																					</SidebarProvider>
																				</div>
																			</div>
																			<RealtimeEventBus />
																			<BackendConnectionOverlayBridge />
																			<ToastRouter />
																		</DockBridgeProvider>
																	</CustomerDataProvider>
																</VacationProvider>
																<UndoManager />
															</ThemeWrapper>
														</UnifiedDataProvider>
													</WebSocketDataProvider>
												</QueryHydration>
											</QueryProvider>
										</BackendConnectionProvider>
									</SpacemanThemeBridge>
								</UiThemeBridge>
							</SettingsProvider>
						</LanguageProvider>
					</ThemeProvider>
				</ErrorBoundaryWrapper>
				<PortalBootstrap />
			</body>
		</html>
	);
}
