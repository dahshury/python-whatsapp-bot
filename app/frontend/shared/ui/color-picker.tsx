'use client'

import { Range, Root, Thumb, Track } from '@radix-ui/react-slider'
import Color from 'color'
import { PipetteIcon } from 'lucide-react'
import {
	type ChangeEventHandler,
	type ComponentProps,
	createContext,
	type HTMLAttributes,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '@/shared/libs/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/select'

// Color picker constants
const DEFAULT_LIGHTNESS = 50 // Default lightness percentage (0-100)
const ALPHA_MULTIPLIER = 100 // Convert alpha from 0-1 range to 0-100 percentage
const DEFAULT_ALPHA = 100 // Default alpha percentage (0-100)
const PERCENTAGE_MULTIPLIER = 100 // Convert between 0-1 and 0-100 percentage ranges

type ColorPickerContextValue = {
	hue: number
	saturation: number
	lightness: number
	alpha: number
	mode: string
	setHue: (hue: number) => void
	setSaturation: (saturation: number) => void
	setLightness: (lightness: number) => void
	setAlpha: (alpha: number) => void
	setMode: (mode: string) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
	undefined
)

export const useColorPicker = () => {
	const context = useContext(ColorPickerContext)

	if (!context) {
		throw new Error('useColorPicker must be used within a ColorPickerProvider')
	}

	return context
}

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
}

export const ColorPicker = ({
	value,
	defaultValue = '#000000',
	onChange,
	className,
	...props
}: ColorPickerProps) => {
	const getColorValue = useCallback(
		() => value ?? defaultValue,
		[value, defaultValue]
	)

	const currentColorValue = getColorValue()
	const currentColor = Color(currentColorValue)

	const [hue, setHue] = useState(() => {
		try {
			return currentColor.hue() || 0
		} catch {
			return 0
		}
	})
	const [saturation, setSaturation] = useState(() => {
		try {
			return currentColor.saturationl() || 0
		} catch {
			return 0
		}
	})
	const [lightness, setLightness] = useState(() => {
		try {
			return currentColor.lightness() || DEFAULT_LIGHTNESS
		} catch {
			return DEFAULT_LIGHTNESS
		}
	})
	const [alpha, setAlpha] = useState(() => {
		try {
			return currentColor.alpha() * ALPHA_MULTIPLIER || DEFAULT_ALPHA
		} catch {
			return DEFAULT_ALPHA
		}
	})
	const [mode, setMode] = useState('hex')
	const isUserInteractionRef = useRef(false)
	const lastValueRef = useRef<string | undefined>(value)
	const onChangeRef = useRef(onChange)

	// Keep onChange ref up to date
	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	// Update color when controlled value changes (only if changed externally)
	useEffect(() => {
		if (value !== undefined && value !== lastValueRef.current) {
			lastValueRef.current = value
			isUserInteractionRef.current = false
			try {
				const color = Color(value)
				setHue(color.hue() || 0)
				setSaturation(color.saturationl() || 0)
				setLightness(color.lightness() || DEFAULT_LIGHTNESS)
				setAlpha(color.alpha() * ALPHA_MULTIPLIER || DEFAULT_ALPHA)
			} catch {
				// Invalid color, keep current state
			}
		}
	}, [value])

	// Notify parent of changes (only when user interacts)
	useEffect(() => {
		if (onChangeRef.current && isUserInteractionRef.current) {
			try {
				const color = Color.hsl(hue, saturation, lightness).alpha(
					alpha / PERCENTAGE_MULTIPLIER
				)
				const hex = color.hex()
				if (hex !== lastValueRef.current) {
					lastValueRef.current = hex
					onChangeRef.current(hex)
				}
			} catch {
				// Ignore conversion errors
			}
		}
	}, [hue, saturation, lightness, alpha])

	// Wrapped setters that mark user interaction
	const setHueWithInteraction = useCallback((newHue: number) => {
		isUserInteractionRef.current = true
		setHue(newHue)
	}, [])

	const setSaturationWithInteraction = useCallback((newSaturation: number) => {
		isUserInteractionRef.current = true
		setSaturation(newSaturation)
	}, [])

	const setLightnessWithInteraction = useCallback((newLightness: number) => {
		isUserInteractionRef.current = true
		setLightness(newLightness)
	}, [])

	const setAlphaWithInteraction = useCallback((newAlpha: number) => {
		isUserInteractionRef.current = true
		setAlpha(newAlpha)
	}, [])

	return (
		<ColorPickerContext.Provider
			value={{
				hue,
				saturation,
				lightness,
				alpha,
				mode,
				setHue: setHueWithInteraction,
				setSaturation: setSaturationWithInteraction,
				setLightness: setLightnessWithInteraction,
				setAlpha: setAlphaWithInteraction,
				setMode,
			}}
		>
			<div className={cn('grid w-full gap-4', className)} {...props} />
		</ColorPickerContext.Provider>
	)
}

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerSelection = ({
	className,
	...props
}: ColorPickerSelectionProps) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const { hue, saturation, lightness, setSaturation, setLightness } =
		useColorPicker()

	// Calculate position from saturation and lightness
	const position = {
		x: saturation / PERCENTAGE_MULTIPLIER,
		y: 1 - lightness / PERCENTAGE_MULTIPLIER,
	}

	const handlePointerMove = useCallback(
		(event: PointerEvent) => {
			if (!(isDragging && containerRef.current)) {
				return
			}

			const rect = containerRef.current.getBoundingClientRect()
			const x = Math.max(
				0,
				Math.min(1, (event.clientX - rect.left) / rect.width)
			)
			const y = Math.max(
				0,
				Math.min(1, (event.clientY - rect.top) / rect.height)
			)

			setSaturation(x * PERCENTAGE_MULTIPLIER)
			setLightness((1 - y) * PERCENTAGE_MULTIPLIER)
		},
		[isDragging, setSaturation, setLightness]
	)

	useEffect(() => {
		if (isDragging) {
			window.addEventListener('pointermove', handlePointerMove)
			window.addEventListener('pointerup', () => setIsDragging(false))
		}
		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', () => setIsDragging(false))
		}
	}, [isDragging, handlePointerMove])

	return (
		<div
			className={cn(
				'relative aspect-[4/3] w-full cursor-crosshair rounded',
				className
			)}
			onPointerDown={(e) => {
				e.preventDefault()
				setIsDragging(true)
				handlePointerMove(e.nativeEvent)
			}}
			ref={containerRef}
			style={{
				background: `linear-gradient(0deg,rgb(0,0,0),transparent),linear-gradient(90deg,rgb(255,255,255),hsl(${hue},100%,50%))`,
			}}
			{...props}
		>
			<div
				className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
				style={{
					left: `${position.x * PERCENTAGE_MULTIPLIER}%`,
					top: `${position.y * PERCENTAGE_MULTIPLIER}%`,
					boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
				}}
			/>
		</div>
	)
}

export type ColorPickerHueProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerHue = ({
	className,
	dir: _dir,
	defaultValue: _defaultValue,
	...props
}: ColorPickerHueProps) => {
	const { hue, setHue } = useColorPicker()

	return (
		<Root
			className={cn('relative flex h-4 w-full touch-none', className)}
			max={360}
			onValueChange={(values) => {
				const [hueValue] = values
				if (hueValue !== undefined) {
					setHue(hueValue)
				}
			}}
			step={1}
			value={[hue]}
			{...props}
		>
			<Track className="relative my-0.5 h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
				<Range className="absolute h-full" />
			</Track>
			<Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</Root>
	)
}

export type ColorPickerAlphaProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerAlpha = ({
	className,
	dir: _dir,
	defaultValue: _defaultValue,
	...props
}: ColorPickerAlphaProps) => {
	const { alpha, setAlpha } = useColorPicker()

	return (
		<Root
			className={cn('relative flex h-4 w-full touch-none', className)}
			max={100}
			onValueChange={(values) => {
				const [alphaValue] = values
				if (alphaValue !== undefined) {
					setAlpha(alphaValue)
				}
			}}
			step={1}
			value={[alpha]}
			{...props}
		>
			<Track
				className="relative my-0.5 h-3 w-full grow rounded-full"
				style={{
					background:
						'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
				}}
			>
				<div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent to-primary/50" />
				<Range className="absolute h-full rounded-full bg-transparent" />
			</Track>
			<Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
		</Root>
	)
}

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>

export const ColorPickerEyeDropper = ({
	className,
	...props
}: ColorPickerEyeDropperProps) => {
	const { setHue, setSaturation, setLightness, setAlpha } = useColorPicker()

	const handleEyeDropper = async () => {
		try {
			// @ts-expect-error - EyeDropper API is experimental
			const eyeDropper = new EyeDropper()
			const result = await eyeDropper.open()
			const color = Color(result.sRGBHex)
			const [h, s, l] = color.hsl().array()

			if (h !== undefined && s !== undefined && l !== undefined) {
				setHue(h)
				setSaturation(s)
				setLightness(l)
			}
			setAlpha(DEFAULT_ALPHA)
		} catch (_error) {
			// Ignore color parsing errors
		}
	}

	return (
		<Button
			className={cn('shrink-0 text-muted-foreground', className)}
			onClick={handleEyeDropper}
			size="icon"
			variant="outline"
			{...props}
		>
			<PipetteIcon size={16} />
		</Button>
	)
}

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>

const formats = ['hex', 'rgb', 'css', 'hsl']

export const ColorPickerOutput = ({
	className,
	...props
}: ColorPickerOutputProps) => {
	const { mode, setMode } = useColorPicker()

	return (
		<Select onValueChange={setMode} value={mode}>
			<SelectTrigger className="h-8 w-[4.5rem] shrink-0 text-xs" {...props}>
				<SelectValue placeholder="Mode" />
			</SelectTrigger>
			<SelectContent>
				{formats.map((format) => (
					<SelectItem className="text-xs" key={format} value={format}>
						{format.toUpperCase()}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

type PercentageInputProps = ComponentProps<typeof Input>

const PercentageInput = ({ className, ...props }: PercentageInputProps) => (
	<div className="relative">
		<Input
			readOnly
			type="text"
			{...props}
			className={cn(
				'h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none',
				className
			)}
		/>
		<span className="-translate-y-1/2 absolute top-1/2 right-2 text-muted-foreground text-xs">
			%
		</span>
	</div>
)

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>

export const ColorPickerFormat = ({
	className,
	...props
}: ColorPickerFormatProps) => {
	const {
		hue,
		saturation,
		lightness,
		alpha,
		mode,
		setHue,
		setSaturation,
		setLightness,
		setAlpha,
	} = useColorPicker()
	const color = Color.hsl(
		hue,
		saturation,
		lightness,
		alpha / PERCENTAGE_MULTIPLIER
	)

	if (mode === 'hex') {
		const hex = color.hex()

		const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
			try {
				const newColor = Color(event.target.value)
				// These setters already mark user interaction
				setHue(newColor.hue())
				setSaturation(newColor.saturationl())
				setLightness(newColor.lightness())
				setAlpha(newColor.alpha() * ALPHA_MULTIPLIER)
			} catch (_error) {
				// Ignore color parsing errors
			}
		}

		return (
			<div
				className={cn(
					'-space-x-px relative flex items-center shadow-sm',
					className
				)}
				{...props}
			>
				<span className="-translate-y-1/2 absolute top-1/2 left-2 text-xs">
					#
				</span>
				<Input
					className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
					onChange={handleChange}
					type="text"
					value={hex}
				/>
				<PercentageInput value={alpha} />
			</div>
		)
	}

	if (mode === 'rgb') {
		const rgb = color
			.rgb()
			.array()
			.map((value) => Math.round(value))

		const rgbChannels = ['r', 'g', 'b'] as const

		return (
			<div
				className={cn('-space-x-px flex items-center shadow-sm', className)}
				{...props}
			>
				{rgb.map((value, index) => (
					<Input
						className={cn(
							'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
							index && 'rounded-l-none',
							className
						)}
						key={rgbChannels[index]}
						readOnly
						type="text"
						value={value}
					/>
				))}
				<PercentageInput value={alpha} />
			</div>
		)
	}

	if (mode === 'css') {
		const rgb = color
			.rgb()
			.array()
			.map((value) => Math.round(value))

		return (
			<div className={cn('w-full shadow-sm', className)} {...props}>
				<Input
					className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
					readOnly
					type="text"
					value={`rgba(${rgb.join(', ')}, ${alpha}%)`}
					{...props}
				/>
			</div>
		)
	}

	if (mode === 'hsl') {
		const hsl = color
			.hsl()
			.array()
			.map((value) => Math.round(value))

		const hslChannels = ['h', 's', 'l'] as const

		return (
			<div
				className={cn('-space-x-px flex items-center shadow-sm', className)}
				{...props}
			>
				{hsl.map((value, index) => (
					<Input
						className={cn(
							'h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none',
							index && 'rounded-l-none',
							className
						)}
						key={hslChannels[index]}
						readOnly
						type="text"
						value={value}
					/>
				))}
				<PercentageInput value={alpha} />
			</div>
		)
	}

	return null
}
