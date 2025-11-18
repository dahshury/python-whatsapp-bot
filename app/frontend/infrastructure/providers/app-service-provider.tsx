'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { ChatAdapter } from '@/features/chat/services/chat.adapter'
import { MetricsAdapter } from '@/features/metrics/services/metrics.adapter'
import { ReservationsPortAdapter } from '@/features/reservations/services/reservations.port.adapter'
import { httpAdapter, wsAdapter } from '@/shared/infrastructure'
import type {
	ChatPort,
	HttpClientPort,
	MetricsPort,
	ReservationsPort,
	WebSocketPort,
} from '@/shared/ports'

export type ServiceRegistry = {
	http: HttpClientPort
	ws: WebSocketPort
	chat: ChatPort
	reservations: ReservationsPort
	metrics: MetricsPort
}

const AppServiceContext = createContext<ServiceRegistry | null>(null)

export function AppServiceProvider({ children }: { children: ReactNode }) {
	const services = useMemo<ServiceRegistry>(() => {
		const chat = new ChatAdapter(wsAdapter, httpAdapter)
		const reservations = new ReservationsPortAdapter()
		const metrics = new MetricsAdapter(wsAdapter)

		return {
			http: httpAdapter,
			ws: wsAdapter,
			chat,
			reservations,
			metrics,
		}
	}, [])

	return (
		<AppServiceContext.Provider value={services}>
			{children}
		</AppServiceContext.Provider>
	)
}

export function useServices(): ServiceRegistry {
	const services = useContext(AppServiceContext)
	if (!services) {
		throw new Error(
			'useServices must be called within AppServiceProvider context'
		)
	}
	return services
}

export function useChatPort(): ChatPort {
	return useServices().chat
}

export function useReservationsPort(): ReservationsPort {
	return useServices().reservations
}

export function useMetricsPort(): MetricsPort {
	return useServices().metrics
}

export function useHttpPort(): HttpClientPort {
	return useServices().http
}

export function useWebSocketPort(): WebSocketPort {
	return useServices().ws
}
