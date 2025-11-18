import { describe, expect, it } from 'vitest'
import { render, screen } from '@/shared/libs/__tests__/utils/render'
import { DocumentSavingIndicator } from '@/widgets/documents/DocumentSavingIndicator'

const LOADING_TEXT_REGEX = /loading/i

describe('DocumentSavingIndicator', () => {
	it('renders loading state', () => {
		render(<DocumentSavingIndicator loading status={{ status: 'idle' }} />)
		expect(screen.getByText(LOADING_TEXT_REGEX)).toBeInTheDocument()
	})
})
