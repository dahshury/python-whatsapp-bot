'use client'
import { cn } from '@shared/libs/utils'
import {
	AnimatePresence,
	type MotionProps,
	motion,
	type Transition,
	type Variant,
} from 'motion/react'

export type TransitionPanelProps = {
	children: React.ReactNode[]
	className?: string
	transition?: Transition
	activeIndex: number
	variants?: { enter: Variant; center: Variant; exit: Variant }
} & MotionProps

export function TransitionPanel({
	children,
	className,
	transition,
	variants,
	activeIndex,
	...motionProps
}: TransitionPanelProps) {
	return (
		<div className={cn('relative', className)}>
			<AnimatePresence
				custom={motionProps.custom}
				initial={false}
				mode="popLayout"
			>
				<motion.div
					key={activeIndex}
					{...(variants ? { variants } : {})}
					{...(transition ? { transition } : {})}
					animate="center"
					exit="exit"
					initial="enter"
					{...motionProps}
				>
					{children[activeIndex]}
				</motion.div>
			</AnimatePresence>
		</div>
	)
}
