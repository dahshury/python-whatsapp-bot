"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			{/* Stats Cards Skeleton */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-[100px]" />
							<Skeleton className="h-4 w-4" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-[60px]" />
							<Skeleton className="h-3 w-[140px] mt-1" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Charts Skeleton */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4">
					<CardHeader>
						<Skeleton className="h-6 w-[150px]" />
						<Skeleton className="h-4 w-[200px]" />
					</CardHeader>
					<CardContent className="pl-2">
						<Skeleton className="h-[350px] w-full" />
					</CardContent>
				</Card>
				<Card className="col-span-3">
					<CardHeader>
						<Skeleton className="h-6 w-[120px]" />
						<Skeleton className="h-4 w-[180px]" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-[350px] w-full" />
					</CardContent>
				</Card>
			</div>

			{/* Table Skeleton */}
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-[180px]" />
					<Skeleton className="h-4 w-[250px]" />
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[...Array(5)].map((_, i) => (
							<div key={i} className="flex items-center space-x-4">
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-[250px]" />
									<Skeleton className="h-4 w-[200px]" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
