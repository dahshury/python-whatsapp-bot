import type { Theme } from '@glideapps/glide-data-grid'
import type React from 'react'

type GridThemeToggleProps = {
	currentTheme: Partial<Theme>
	lightTheme: Partial<Theme>
	darkTheme: Partial<Theme>
	iconColor: string
	filteredRowCount: number
	onThemeChange: (theme: Partial<Theme>) => void
}

export const GridThemeToggle: React.FC<GridThemeToggleProps> = ({
	currentTheme,
	lightTheme,
	darkTheme,
	iconColor,
	filteredRowCount,
	onThemeChange,
}) => (
	<div
		style={{
			padding: '16px',
			marginBottom: '16px',
			backgroundColor: currentTheme === darkTheme ? '#2a2a2a' : '#f5f5f5',
			borderRadius: '8px',
			display: 'flex',
			gap: '12px',
			alignItems: 'center',
		}}
	>
		<span style={{ color: iconColor }}>Theme:</span>
		<button
			onClick={() => onThemeChange(lightTheme)}
			style={{
				padding: '8px 16px',
				backgroundColor:
					currentTheme === lightTheme ? '#4F5DFF' : 'transparent',
				color: currentTheme === lightTheme ? 'white' : iconColor,
				border: '1px solid #4F5DFF',
				borderRadius: '4px',
				cursor: 'pointer',
			}}
			type="button"
		>
			Light
		</button>
		<button
			onClick={() => onThemeChange(darkTheme)}
			style={{
				padding: '8px 16px',
				backgroundColor: currentTheme === darkTheme ? '#4F5DFF' : 'transparent',
				color: currentTheme === darkTheme ? 'white' : iconColor,
				border: '1px solid #4F5DFF',
				borderRadius: '4px',
				cursor: 'pointer',
			}}
			type="button"
		>
			Dark
		</button>
		<span style={{ marginLeft: 'auto', color: iconColor, fontSize: '14px' }}>
			Rows: {filteredRowCount} | Press Ctrl+F to search | Right-click column
			headers for options
		</span>
	</div>
)
