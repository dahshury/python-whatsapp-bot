"use client";

import { ToastRouter } from "@shared/libs/toast/toast-router";
import { DvhInit } from "@shared/ui/dvh-init";
import { ErrorRecoveryInit } from "@shared/ui/error-recovery-init";
import { MainContentWrapper } from "@shared/ui/main-content-wrapper";
import { SidebarProvider } from "@shared/ui/sidebar";
import { SuppressExcalidrawWarnings } from "@shared/ui/suppress-excalidraw-warnings";
import { SpacemanThemeBridge } from "@shared/ui/theme/spaceman-theme-bridge";
import { UiThemeBridge } from "@shared/ui/theme/ui-theme-bridge";
import { ThemeProvider } from "@shared/ui/theme-provider";
import { ThemeWrapper } from "@shared/ui/theme-wrapper";
import { UndoManager } from "@shared/ui/undo-manager";
import type React from "react";
import { AppSidebar } from "@/features/navigation/app-sidebar";
import { PersistentDockHeader } from "@/features/navigation/persistent-dock-header";
import { BackendConnectionProvider } from "@/shared/libs/backend-connection-provider";
import { CustomerDataProvider } from "@/shared/libs/data/customer-data-context";
import { UnifiedDataProvider } from "@/shared/libs/data/unified-data-provider";
import { WebSocketDataProvider } from "@/shared/libs/data/websocket-data-provider";
import { DockBridgeProvider } from "@/shared/libs/dock-bridge-context";
import { RealtimeEventBus } from "@/shared/libs/realtime-event-bus";
import { LanguageProvider } from "@/shared/libs/state/language-context";
import { SettingsProvider } from "@/shared/libs/state/settings-context";
import { VacationProvider } from "@/shared/libs/state/vacation-context";

/**
 * Minimal shell: Only global theme, no data providers, sidebar, or navigation
 * Used for: Demo page, 404 pages, marketing pages
 */
export function MinimalThemeShell({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			storageKey="theme"
		>
			<SettingsProvider>
				<UiThemeBridge>
					<SpacemanThemeBridge>
						<ThemeWrapper>
							{children}
							<ToastRouter />
						</ThemeWrapper>
					</SpacemanThemeBridge>
				</UiThemeBridge>
			</SettingsProvider>
		</ThemeProvider>
	);
}

/**
 * Documents shell: Data providers without sidebar/header
 * Used for: Documents page - needs WebSocket, backend, data but clean focused UI
 */
export function DocumentsShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SuppressExcalidrawWarnings />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				storageKey="theme"
			>
				<LanguageProvider>
					<SettingsProvider>
						<UiThemeBridge>
							<SpacemanThemeBridge>
								<BackendConnectionProvider>
									<WebSocketDataProvider>
										<UnifiedDataProvider>
											<ThemeWrapper>
												<CustomerDataProvider>
													<DvhInit />
													<div
														className="flex flex-col"
														style={{ minHeight: "var(--doc-dvh, 100dvh)" }}
													>
														<div className="flex flex-1 overflow-hidden">
															<MainContentWrapper>
																{children}
															</MainContentWrapper>
														</div>
													</div>
													<RealtimeEventBus />
													<ToastRouter />
												</CustomerDataProvider>
											</ThemeWrapper>
										</UnifiedDataProvider>
									</WebSocketDataProvider>
								</BackendConnectionProvider>
							</SpacemanThemeBridge>
						</UiThemeBridge>
					</SettingsProvider>
				</LanguageProvider>
			</ThemeProvider>
		</>
	);
}

/**
 * Dashboard shell: Header with data providers but no sidebar
 * Used for: Dashboard page - needs dock header and WebSocket but clean focused layout
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SuppressExcalidrawWarnings />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				storageKey="theme"
			>
				<LanguageProvider>
					<SettingsProvider>
						<UiThemeBridge>
							<SpacemanThemeBridge>
								<BackendConnectionProvider>
									<WebSocketDataProvider>
										<UnifiedDataProvider>
											<ThemeWrapper>
												<CustomerDataProvider>
													<DockBridgeProvider>
														<DvhInit />
														<div
															className="flex flex-col"
															style={{ minHeight: "var(--doc-dvh, 100dvh)" }}
														>
															<div className="flex flex-1 overflow-hidden">
																<MainContentWrapper>
																	<PersistentDockHeader />
																	{children}
																</MainContentWrapper>
															</div>
														</div>
														<RealtimeEventBus />
														<ToastRouter />
													</DockBridgeProvider>
												</CustomerDataProvider>
											</ThemeWrapper>
										</UnifiedDataProvider>
									</WebSocketDataProvider>
								</BackendConnectionProvider>
							</SpacemanThemeBridge>
						</UiThemeBridge>
					</SettingsProvider>
				</LanguageProvider>
			</ThemeProvider>
		</>
	);
}

/**
 * Full application shell: Complete provider hierarchy with sidebar, navigation, data providers
 * Used for: Calendar page and other data-driven pages requiring full navigation
 */
export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<>
			<SuppressExcalidrawWarnings />
			<ErrorRecoveryInit />
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				storageKey="theme"
			>
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
															<DvhInit />
															<div
																className="flex flex-col"
																style={{ minHeight: "var(--doc-dvh, 100dvh)" }}
															>
																<div className="flex flex-1 overflow-hidden">
																	<SidebarProvider>
																		<AppSidebar />
																		<MainContentWrapper>
																			<PersistentDockHeader />
																			{children}
																		</MainContentWrapper>
																	</SidebarProvider>
																</div>
															</div>
															<RealtimeEventBus />
															<ToastRouter />
														</DockBridgeProvider>
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
		</>
	);
}

/**
 * Root shell: Dispatch to minimal or full shell based on layout context
 * This is used by root layout; child layouts specify their shell explicitly
 */
export function ProvidersShell({ children }: { children: React.ReactNode }) {
	// This is now a pass-through; specific layouts choose MinimalThemeShell, DocumentsShell, or AppShell
	// This allows for explicit control at each layout level
	return <>{children}</>;
}
