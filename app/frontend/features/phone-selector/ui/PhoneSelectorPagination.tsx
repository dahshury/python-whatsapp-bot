'use client'

import type React from 'react'
import { cn } from '@/shared/libs/utils'
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/shared/ui/pagination'

type PhoneSelectorPaginationProps = {
	currentPage: number
	totalPages: number
	onPageChange: (page: number) => void
	className?: string
}

const MAX_PAGES_WITHOUT_ELLIPSIS = 5
const PAGES_AROUND_CURRENT = 2
const PAGES_BEFORE_ELLIPSIS_START = 2
const PAGES_FROM_END = 2

/**
 * Pagination footer component for phone selector.
 * Shows page numbers with ellipses for large page counts.
 */
export function PhoneSelectorPagination({
	currentPage,
	totalPages,
	onPageChange,
	className,
}: PhoneSelectorPaginationProps) {
	const handlePageClick = (page: number, event: React.MouseEvent) => {
		event.preventDefault()
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			onPageChange(page)
		}
	}

	const getPageNumbers = () => {
		const pages: (number | 'ellipsis')[] = []

		if (totalPages <= MAX_PAGES_WITHOUT_ELLIPSIS) {
			// Show all pages if 5 or fewer
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i)
			}
		} else {
			// Always show first page
			pages.push(1)

			if (currentPage <= PAGES_AROUND_CURRENT) {
				// Show pages 1-2, then ellipsis, then last
				for (let i = 2; i <= PAGES_BEFORE_ELLIPSIS_START; i++) {
					pages.push(i)
				}
				pages.push('ellipsis')
				pages.push(totalPages)
			} else if (currentPage >= totalPages - 1) {
				// Show first, then ellipsis, then last 2 pages
				pages.push('ellipsis')
				for (let i = totalPages - PAGES_FROM_END; i <= totalPages; i++) {
					pages.push(i)
				}
			} else {
				// Show first, ellipsis, current-1, current, current+1, ellipsis, last
				pages.push('ellipsis')
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i)
				}
				pages.push('ellipsis')
				pages.push(totalPages)
			}
		}

		return pages
	}

	const pageNumbers = getPageNumbers()

	if (totalPages <= 1) {
		return null // Don't show pagination if only one page
	}

	return (
		<div className={cn('border-t p-1.5', className)}>
			<Pagination className="text-sm">
				<PaginationContent className="gap-0.5">
					<PaginationItem>
						<PaginationPrevious
							aria-disabled={currentPage === 1}
							className={cn(
								'h-7 px-2 text-xs',
								currentPage === 1 && 'pointer-events-none opacity-50'
							)}
							href="#"
							onClick={(e) => handlePageClick(currentPage - 1, e)}
						/>
					</PaginationItem>

					{pageNumbers.map((page, index) => {
						if (page === 'ellipsis') {
							return (
								<PaginationItem key={`ellipsis-${index}-${totalPages}`}>
									<PaginationEllipsis />
								</PaginationItem>
							)
						}

						return (
							<PaginationItem key={page}>
								<PaginationLink
									aria-current={page === currentPage ? 'page' : undefined}
									className="h-7 w-7 text-xs"
									href="#"
									isActive={page === currentPage}
									onClick={(e) => handlePageClick(page, e)}
								>
									{page}
								</PaginationLink>
							</PaginationItem>
						)
					})}

					<PaginationItem>
						<PaginationNext
							aria-disabled={currentPage === totalPages}
							className={cn(
								'h-7 px-2 text-xs',
								currentPage === totalPages && 'pointer-events-none opacity-50'
							)}
							href="#"
							onClick={(e) => handlePageClick(currentPage + 1, e)}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		</div>
	)
}
