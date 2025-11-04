import type React from 'react'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'

type FullscreenContextShape = {
	isFullscreen: boolean
	width: number
	height: number
	enterFullscreen: () => void
	exitFullscreen: () => void
	toggleFullscreen: () => void
}

const FullscreenContext = createContext<FullscreenContextShape | undefined>(
	undefined
)

export const FullscreenProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== 'undefined' ? window.innerWidth : 0,
		height: typeof window !== 'undefined' ? window.innerHeight : 0,
	})

	const enterFullscreen = useCallback(() => {
		setIsFullscreen(true)
	}, [])

	const exitFullscreen = useCallback(() => {
		setIsFullscreen(false)
	}, [])

	const toggleFullscreen = useCallback(() => {
		setIsFullscreen((prev) => !prev)
	}, [])

	// Listen for ESC key to exit fullscreen
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isFullscreen) {
				exitFullscreen()
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isFullscreen, exitFullscreen])

	// Update window dimensions on resize for consumers that need it
	useEffect(() => {
		const handleResize = () => {
			setWindowSize({ width: window.innerWidth, height: window.innerHeight })
		}

		// Initial measurement
		handleResize()

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	// Calculate the actual available dimensions for the grid
	// Account for padding in the fullscreen wrapper (60px top, 40px bottom, 40px horizontal)
	const FULLSCREEN_WIDTH_PADDING = 40
	const FULLSCREEN_HEIGHT_PADDING = 100
	const value: FullscreenContextShape = {
		isFullscreen,
		width: isFullscreen
			? windowSize.width - FULLSCREEN_WIDTH_PADDING
			: windowSize.width,
		height: isFullscreen
			? windowSize.height - FULLSCREEN_HEIGHT_PADDING
			: windowSize.height,
		enterFullscreen,
		exitFullscreen,
		toggleFullscreen,
	}

	return (
		<FullscreenContext.Provider value={value}>
			{children}
		</FullscreenContext.Provider>
	)
}

export const useFullscreen = () => {
	const context = useContext(FullscreenContext)
	if (!context) {
		throw new Error('useFullscreen must be used within a FullscreenProvider')
	}
	return context
}
