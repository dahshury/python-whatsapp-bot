import { useEffect, useState } from 'react'
import {
	PAGINATION_LEADING_WINDOW_END,
	PAGINATION_MAX_SIMPLE_PAGES,
	PAGINATION_NEIGHBORHOOD_DISTANCE,
	PAGINATION_PENULTIMATE_OFFSET,
	PAGINATION_SECOND_PAGE_NUMBER,
	PAGINATION_TRAILING_WINDOW_START,
} from '../dashboard/constants'

export type UsePaginationOptions = {
	totalItems: number
	itemsPerPage: number
}

export type UsePaginationReturn = {
	currentPage: number
	totalPages: number
	paginatedItems: number
	handlePrevPage: () => void
	handleNextPage: () => void
	setCurrentPage: (page: number) => void
	isSimplePagination: boolean
	currentPageNumber: number
	paginationConfig: {
		maxSimplePages: number
		neighborhoodDistance: number
		leadingWindowEnd: number
		trailingWindowStart: number
		secondPageNumber: number
		penultimateOffset: number
	}
}

/**
 * Custom hook for pagination logic
 * Handles page state, navigation, and pagination configuration
 * @param options - Pagination options with total items and items per page
 * @returns Pagination state and handlers
 */
export function usePagination({
	totalItems,
	itemsPerPage,
}: UsePaginationOptions): UsePaginationReturn {
	const [currentPage, setCurrentPage] = useState(0)
	const totalPages = Math.ceil(totalItems / itemsPerPage)

	useEffect(() => {
		setCurrentPage(0)
	}, [])

	const handlePrevPage = () => {
		setCurrentPage((prev) => Math.max(0, prev - 1))
	}

	const handleNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
	}

	return {
		currentPage,
		totalPages,
		paginatedItems: totalItems,
		handlePrevPage,
		handleNextPage,
		setCurrentPage,
		isSimplePagination: totalPages <= PAGINATION_MAX_SIMPLE_PAGES,
		currentPageNumber: currentPage + 1,
		paginationConfig: {
			maxSimplePages: PAGINATION_MAX_SIMPLE_PAGES,
			neighborhoodDistance: PAGINATION_NEIGHBORHOOD_DISTANCE,
			leadingWindowEnd: PAGINATION_LEADING_WINDOW_END,
			trailingWindowStart: PAGINATION_TRAILING_WINDOW_START,
			secondPageNumber: PAGINATION_SECOND_PAGE_NUMBER,
			penultimateOffset: PAGINATION_PENULTIMATE_OFFSET,
		},
	}
}
