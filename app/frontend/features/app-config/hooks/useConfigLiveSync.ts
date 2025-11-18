'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { APP_CONFIG_QUERY_KEY } from '@/entities/app-config'

const CHANNEL_NAME = 'app-config'
const EVENT_TYPE = 'APP_CONFIG_UPDATED'

export const emitAppConfigUpdated = () => {
	if (
		typeof window === 'undefined' ||
		typeof BroadcastChannel === 'undefined'
	) {
		return
	}
	const channel = new BroadcastChannel(CHANNEL_NAME)
	channel.postMessage({ type: EVENT_TYPE })
	channel.close()
}

export const useConfigLiveSync = () => {
	const queryClient = useQueryClient()

	useEffect(() => {
		if (
			typeof window === 'undefined' ||
			typeof BroadcastChannel === 'undefined'
		) {
			return
		}
		const channel = new BroadcastChannel(CHANNEL_NAME)
		const handler = (event: MessageEvent<{ type?: string }>) => {
			if (event.data?.type === EVENT_TYPE) {
				queryClient.invalidateQueries({
					queryKey: APP_CONFIG_QUERY_KEY.all(),
				})
			}
		}
		channel.addEventListener('message', handler)
		return () => {
			channel.removeEventListener('message', handler)
			channel.close()
		}
	}, [queryClient])
}
