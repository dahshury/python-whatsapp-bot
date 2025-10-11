"use client";

import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export function DashboardSkeleton() {
	return (
		<div className="space-y-6 mx-auto w-full max-w-7xl">
			{/* Stats Cards Skeleton */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={`dashboard-skeleton-stat-card-${i + 1}`}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-[6.25rem]" />
							<Skeleton className="h-4 w-4" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-[3.75rem]" />
							<Skeleton className="h-3 w-[8.75rem] mt-1" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts Skeleton */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4">
					<CardHeader>
						<Skeleton className="h-6 w-[9.375rem]" />
						<Skeleton className="h-4 w-[12.5rem]" />
					</CardHeader>
					<CardContent className="pl-2">
						<Skeleton className="h-[21.875rem] w-full" />
					</CardContent>
				</Card>
				<Card className="col-span-3">
					<CardHeader>
						<Skeleton className="h-6 w-[7.5rem]" />
						<Skeleton className="h-4 w-[11.25rem]" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-[21.875rem] w-full" />
					</CardContent>
				</Card>
			</div>

			{/* Table Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-[11.25rem]" />
					<Skeleton className="h-4 w-[15.625rem]" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[...Array(5)].map((_, i) => (
							<div key={`dashboard-skeleton-list-item-${i + 1}`} className="flex items-center space-x-4">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-[15.625rem]" />
									<Skeleton className="h-4 w-[12.5rem]" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
