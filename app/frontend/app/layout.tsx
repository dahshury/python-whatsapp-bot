import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type React from "react";
import "./globals.css";
import "@glideapps/glide-data-grid/dist/index.css";
import "@ncdai/react-wheel-picker/style.css";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";
import { ErrorRecoveryInit } from "@/components/error-recovery-init";
import { MainContentWrapper } from "@/components/main-content-wrapper";
import { RouteTransition } from "@/components/motion-primitives/route-transition";
import { PersistentDockHeader } from "@/components/persistent-dock-header";
import { PortalBootstrap } from "@/components/portal-bootstrap";
import { THEME_OPTIONS } from "@/components/settings/theme-data";
import { SpacemanThemeBridge } from "@/components/theme/spaceman-theme-bridge";
import { UiThemeBridge } from "@/components/theme/ui-theme-bridge";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { UndoManager } from "@/components/UndoManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { BackendConnectionProvider } from "@/lib/backend-connection-provider";
import { CustomerDataProvider } from "@/lib/customer-data-context";
import { DockBridgeProvider } from "@/lib/dock-bridge-context";
import { LanguageProvider } from "@/lib/language-context";
import { RealtimeEventBus } from "@/lib/realtime-event-bus";
import { SettingsProvider } from "@/lib/settings-context";
import { ToastRouter } from "@/lib/toast-router";
import { UnifiedDataProvider } from "@/lib/unified-data-provider";
import { VacationProvider } from "@/lib/vacation-context";
import { WebSocketDataProvider } from "@/lib/websocket-data-provider";

// import { GlobalSettings } from "@/components/global-settings"

/**
 * Generates a safe theme initialization script that only allows specific theme classes
 */
function getThemeInitScript(): string {
	const allowedThemes = THEME_OPTIONS.map((t) => t.value);
	return `((function(){try{var t=localStorage.getItem('styleTheme');if(!t||!${JSON.stringify(
		allowedThemes,
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
	width: 1280,
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
				{/* Preconnect to backend to speed up initial WebSocket handshake (localhost only) */}
				<link
					rel="preconnect"
					href="http://localhost:8000"
					crossOrigin="anonymous"
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
							<UiThemeBridge>
								<SpacemanThemeBridge>
									<BackendConnectionProvider>
										<WebSocketDataProvider>
											<UnifiedDataProvider>
												<ThemeWrapper>
													<VacationProvider>
														<CustomerDataProvider>
															<DockBridgeProvider>
																<div className="flex flex-col h-screen">
																	<div className="flex flex-1 overflow-hidden">
																		<SidebarProvider>
																			<ConditionalAppSidebar />
																			<MainContentWrapper>
																				<PersistentDockHeader />
																				<RouteTransition>
																					{children}
																				</RouteTransition>
																			</MainContentWrapper>
																		</SidebarProvider>
																	</div>
																</div>
															</DockBridgeProvider>
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
							</UiThemeBridge>
						</SettingsProvider>
					</LanguageProvider>
				</ThemeProvider>
				<PortalBootstrap />
			</body>
		</html>
	);
}
