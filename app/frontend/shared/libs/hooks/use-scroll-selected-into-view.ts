import { useEffect, useRef, useState } from 'react'

export function useScrollSelectedIntoView<T extends HTMLElement>() {
	const selectedRef = useRef<T | null>(null)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		if (!isOpen) {
			return
		}
		queueMicrotask(() => {
			try {
				selectedRef.current?.scrollIntoView({
					block: 'nearest',
					inline: 'nearest',
					behavior: 'auto',
				})
			} catch {
				// Ignore scrolling errors (element may be detached from DOM).
			}
		})
	}, [isOpen])

	return { selectedRef, isOpen, setIsOpen } as const
}
