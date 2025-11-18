import type { GridColumnConfig } from '../../types/grid-data'
import type { SampleDataProvider } from '../services/CellFactory'

const SAMPLE_NAMES = [
	'John Smith',
	'Maria Garcia',
	'Ahmed Hassan',
	'Sarah Johnson',
	'Chen Wei',
	'Anna Kowalski',
	'David Brown',
	'Fatima Al-Zahra',
	'Pierre Dubois',
	'Yuki Tanaka',
	'Elena Rodriguez',
	'Michael Davis',
	'Priya Sharma',
	'Lars Andersen',
	'Sofia Rossi',
	'James Wilson',
	'Aisha Okafor',
	'Carlos Mendez',
	'Emma Thompson',
	'Ali Rahman',
]

const SEED_MULTIPLIER = 1000 // keep as plain numeric to satisfy linter rule
const RANDOM_MULTIPLIER = 10_000
const THREE = 3
const TEN_THOUSAND = 10_000
const ONE_HUNDRED = 100
const TWO_DECIMALS = 100
const FOUR = 4
const TWELVE = 12
const TWENTY_EIGHT = 28
const YEAR_1970 = 1970
const HOURS_IN_DAY = 24
const MINUTES_IN_HOUR = 60

function seededRandom(seed: number): number {
	const x = Math.sin(seed) * RANDOM_MULTIPLIER
	return x - Math.floor(x)
}

export const devSampleDataProvider: SampleDataProvider = (
	row: number,
	col: number,
	column: GridColumnConfig
) => {
	const seed = row * SEED_MULTIPLIER + col
	const rand = seededRandom(seed)

	switch (column.kind) {
		case 'text':
			return SAMPLE_NAMES[row % SAMPLE_NAMES.length]
		case 'dropdown':
			return (column.allowedValues || ['Option A', 'Option B', 'Option C'])[
				Math.floor(rand * THREE) % THREE
			]
		case 'number':
			return (
				Math.round((rand * TEN_THOUSAND + ONE_HUNDRED) * TWO_DECIMALS) /
				TWO_DECIMALS
			)
		case 'date': {
			const BASE_YEAR = 2020
			const MIN_DAY = 1
			return new Date(
				BASE_YEAR + Math.floor(rand * FOUR),
				Math.floor(rand * TWELVE),
				Math.floor(rand * TWENTY_EIGHT) + MIN_DAY
			)
		}
		case 'time':
			return new Date(
				YEAR_1970,
				0,
				1,
				Math.floor(rand * HOURS_IN_DAY),
				Math.floor(rand * MINUTES_IN_HOUR)
			)
		default:
			return `Cell ${row},${col}`
	}
}
