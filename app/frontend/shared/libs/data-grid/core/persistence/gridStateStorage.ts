export type GridStateStorage = {
	getItem: (key: string) => string | null
	setItem: (key: string, value: string) => void
	removeItem: (key: string) => void
	exists: (key: string) => boolean
}
