'use client'

import '@/shared/libs/clipboard/polyfill'

import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { TanstackQueryProvider } from '@/app/provider/tanstack-query/tanstack-query-provider'
import { AppServiceProvider } from '@/infrastructure/providers/app-service-provider'
import { BackendConnectionProvider } from '@/shared/libs/backend-connection-provider'
import { CustomerDataProvider } from '@/shared/libs/data/customer-data-context'
import { ReservationCacheBridge } from '@/shared/libs/data/reservation-cache-bridge'
import { UnifiedDataProvider } from '@/shared/libs/data/unified-data-provider'
import { WebSocketDataProvider } from '@/shared/libs/data/websocket-data-provider'
import { DockBridgeProvider } from '@/shared/libs/dock-bridge-context'
import { RealtimeEventBus } from '@/shared/libs/realtime-event-bus'
import { VacationProvider } from '@/shared/libs/state/vacation-context'
import { ToastRouter } from '@/shared/libs/toast/toast-router'
import { AppShellVisibilityProvider } from '@/shared/ui/app-shell-visibility'
import { DvhInit } from '@/shared/ui/dvh-init'
import { ErrorRecoveryInit } from '@/shared/ui/error-recovery-init'
import { MainContentWrapper } from '@/shared/ui/main-content-wrapper'
import { PortalBootstrap } from '@/shared/ui/portal-bootstrap'
import { SidebarProvider } from '@/shared/ui/sidebar'
import { SuppressResizeObserverWarnings } from '@/shared/ui/suppress-resize-observer-warnings'
import { SpacemanThemeBridge } from '@/shared/ui/theme/spaceman-theme-bridge'
import { UiThemeBridge } from '@/shared/ui/theme/ui-theme-bridge'
import { ThemeProvider } from '@/shared/ui/theme-provider'
import { ThemeWrapper } from '@/shared/ui/theme-wrapper'
import { UndoManager } from '@/shared/ui/undo-manager'

type AppProvidersClientProps = {
	children: ReactNode
	headerSlot: ReactNode
	sidebarSlot: ReactNode
}

export function AppProvidersClient({
	children,
	headerSlot,
	sidebarSlot,
}: AppProvidersClientProps) {
	const pathname = usePathname()
	const isMinimalRoute = pathname === '/tldraw' || pathname === '/config'
	const [showShell, setShowShell] = useState(!isMinimalRoute)

	useEffect(() => {
		setShowShell(!isMinimalRoute)
	}, [isMinimalRoute])

	// React hooks must be called unconditionally before any early returns
	const appShellContextValue = useMemo(
		() => ({
			showShell,
			setShowShell,
		}),
		[showShell]
	)
	const headerContent =
		showShell && headerSlot ? (
			<div data-app-shell="header">{headerSlot}</div>
		) : null

	// Note: Heavy CSS is loaded via static imports below
	// They're code-split by Next.js but will still be in the bundle
	// The key optimization is skipping all providers and JavaScript execution

	// For minimal routes like /tldraw, skip ALL providers and return children directly
	// This prevents WebSocket connections, data fetching, and all app infrastructure
	// For /config, we need providers but no shell (sidebar/header)
	if (pathname === '/tldraw') {
		return (
			<div
				className="h-screen w-screen"
				style={{
					height: 'var(--doc-dvh, 100dvh)',
				}}
			>
				{children}
			</div>
		)
	}

	// Config page needs providers but no shell
	if (pathname === '/config') {
		return (
			<>
				<ErrorRecoveryInit />
				<SuppressResizeObserverWarnings />
				<AppServiceProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						disableTransitionOnChange
						enableSystem
					>
						<UiThemeBridge>
							<BackendConnectionProvider>
								<TanstackQueryProvider>
									<SpacemanThemeBridge>
										<ReservationCacheBridge />
										<ThemeWrapper>
											<DvhInit />
											<PortalBootstrap />
											<ToastRouter />
											{children}
										</ThemeWrapper>
									</SpacemanThemeBridge>
								</TanstackQueryProvider>
							</BackendConnectionProvider>
						</UiThemeBridge>
					</ThemeProvider>
				</AppServiceProvider>
			</>
		)
	}

	return (
		<>
			<ErrorRecoveryInit />
			<SuppressResizeObserverWarnings />
			<AppServiceProvider>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					disableTransitionOnChange
					enableSystem
				>
					<UiThemeBridge>
						<BackendConnectionProvider>
							<WebSocketDataProvider>
								<UnifiedDataProvider>
									<TanstackQueryProvider>
										<SpacemanThemeBridge>
											<ReservationCacheBridge />
											<ThemeWrapper>
												<VacationProvider>
													<CustomerDataProvider>
														<DockBridgeProvider>
															<DvhInit />
															{showShell ? (
																<div
																	className="flex h-screen flex-col overflow-hidden"
																	style={{
																		height: 'var(--doc-dvh, 100dvh)',
																	}}
																>
																	<div className="flex flex-1 overflow-hidden">
																		<AppShellVisibilityProvider
																			value={appShellContextValue}
																		>
																			<SidebarProvider>
																				<div data-app-shell="sidebar">
																					{sidebarSlot}
																				</div>
																				<MainContentWrapper
																					header={headerContent}
																				>
																					{children}
																				</MainContentWrapper>
																			</SidebarProvider>
																		</AppShellVisibilityProvider>
																	</div>
																</div>
															) : (
																<div
																	className="h-screen w-screen"
																	style={{
																		height: 'var(--doc-dvh, 100dvh)',
																	}}
																>
																	{children}
																</div>
															)}
															<RealtimeEventBus />
															<ToastRouter />
															<PortalBootstrap />
														</DockBridgeProvider>
													</CustomerDataProvider>
												</VacationProvider>
												<UndoManager />
											</ThemeWrapper>
										</SpacemanThemeBridge>
									</TanstackQueryProvider>
								</UnifiedDataProvider>
							</WebSocketDataProvider>
						</BackendConnectionProvider>
					</UiThemeBridge>
				</ThemeProvider>
			</AppServiceProvider>
		</>
	)
}
