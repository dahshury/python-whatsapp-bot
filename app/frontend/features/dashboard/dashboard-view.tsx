"use client";

import {
	CalendarDays,
	Clock,
	MessageSquare,
	TrendingUp,
	Users,
	XCircle,
} from "lucide-react";
import { EnhancedDashboardView } from "@/features/dashboard/dashboard/enhanced-dashboard-view";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

// Helper to get activity type color
function getActivityTypeColor(type: string): string {
	switch (type) {
		case "reservation":
			return "bg-primary";
		case "conversation":
			return "bg-chart-3";
		default:
			return "bg-destructive";
	}
}

// Helper to get status badge variant
function getStatusBadgeVariant(
	status: string
): "default" | "secondary" | "destructive" {
	switch (status) {
		case "confirmed":
			return "default";
		case "completed":
			return "secondary";
		default:
			return "destructive";
	}
}

export function DashboardView() {
	return <EnhancedDashboardView />;
}

// Keep original implementation as backup
export function _OriginalDashboardView() {
	const stats = {
		totalReservations: 156,
		totalConversations: 89,
		totalCancellations: 23,
		conversionRate: 87.2,
		avgResponseTime: "2.3 min",
		activeCustomers: 134,
	};

	const recentActivity = [
		{
			id: 1,
			type: "reservation",
			customer: "Ahmed Ali",
			time: "2 hours ago",
			status: "confirmed",
		},
		{
			id: 2,
			type: "conversation",
			customer: "Sara Mohammed",
			time: "4 hours ago",
			status: "completed",
		},
		{
			id: 3,
			type: "cancellation",
			customer: "Omar Hassan",
			time: "6 hours ago",
			status: "cancelled",
		},
	];

	const monthlyData = [
		{ month: "Jan", reservations: 45, conversations: 32, cancellations: 8 },
		{ month: "Feb", reservations: 52, conversations: 38, cancellations: 6 },
		{ month: "Mar", reservations: 59, conversations: 41, cancellations: 9 },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl">Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of your reservation management system
				</p>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Total Reservations
						</CardTitle>
						<CalendarDays className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.totalReservations}</div>
						<p className="text-muted-foreground text-xs">
							<span className="text-green-600">+12%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Conversations</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.totalConversations}</div>
						<p className="text-muted-foreground text-xs">
							<span className="text-green-600">+8%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Cancellations</CardTitle>
						<XCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.totalCancellations}</div>
						<p className="text-muted-foreground text-xs">
							<span className="text-red-600">+3%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Conversion Rate
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.conversionRate}%</div>
						<Progress className="mt-2" value={stats.conversionRate} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Avg Response Time
						</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.avgResponseTime}</div>
						<p className="text-muted-foreground text-xs">
							<span className="text-green-600">-15%</span> improvement
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Active Customers
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{stats.activeCustomers}</div>
						<p className="text-muted-foreground text-xs">
							<span className="text-green-600">+5%</span> from last month
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Recent Activity */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{recentActivity.map((activity) => (
								<div
									className="flex items-center justify-between"
									key={activity.id}
								>
									<div className="flex items-center gap-3">
										<div
											className={`h-2 w-2 rounded-full ${getActivityTypeColor(activity.type)}`}
										/>
										<div>
											<p className="font-medium">{activity.customer}</p>
											<p className="text-muted-foreground text-sm">
												{activity.time}
											</p>
										</div>
									</div>
									<Badge variant={getStatusBadgeVariant(activity.status)}>
										{activity.status}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Monthly Overview</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{monthlyData.map((month) => (
								<div className="space-y-2" key={month.month}>
									<div className="flex justify-between text-sm">
										<span className="font-medium">{month.month}</span>
										<span className="text-muted-foreground">
											{month.reservations + month.conversations} total
										</span>
									</div>
									<div className="grid grid-cols-3 gap-2 text-xs">
										<div className="text-center">
											<div className="font-medium text-blue-600">
												{month.reservations}
											</div>
											<div className="text-muted-foreground">Reservations</div>
										</div>
										<div className="text-center">
											<div className="font-medium text-green-600">
												{month.conversations}
											</div>
											<div className="text-muted-foreground">Conversations</div>
										</div>
										<div className="text-center">
											<div className="font-medium text-red-600">
												{month.cancellations}
											</div>
											<div className="text-muted-foreground">Cancellations</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
