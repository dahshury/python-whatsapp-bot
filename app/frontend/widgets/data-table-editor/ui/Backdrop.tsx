'use client'
import { motion } from 'framer-motion'

type BackdropProps = {
	onRequestClose: () => void
	zIndex: number
	backdropClassName?: string
	backdropKey?: string
}

export function Backdrop({
	onRequestClose,
	zIndex,
	backdropClassName,
	backdropKey,
}: BackdropProps) {
	return (
		<motion.button
			animate={{ opacity: 1 }}
			className={
				backdropClassName ??
				'dialog-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm'
			}
			exit={{ opacity: 0 }}
			initial={{ opacity: 0 }}
			key={backdropKey ?? 'dt-backdrop'}
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onRequestClose()
				}
			}}
			onKeyDown={(e) => {
				if (e.key === 'Escape') {
					onRequestClose()
				}
			}}
			style={{ zIndex }}
			transition={{ duration: 0.25, ease: 'easeInOut' }}
			type="button"
		/>
	)
}
