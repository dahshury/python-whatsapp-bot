"use client";

import {
	CalendarDays,
	Clock,
	MessageSquare,
	TrendingUp,
	Users,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EnhancedDashboardView } from "./dashboard/enhanced-dashboard-view";

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
				<h1 className="text-3xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Overview of your reservation management system
				</p>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Reservations
						</CardTitle>
						<CalendarDays className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalReservations}</div>
						<p className="text-xs text-muted-foreground">
							<span className="text-green-600">+12%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Conversations</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalConversations}</div>
						<p className="text-xs text-muted-foreground">
							<span className="text-green-600">+8%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Cancellations</CardTitle>
						<XCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.totalCancellations}</div>
						<p className="text-xs text-muted-foreground">
							<span className="text-red-600">+3%</span> from last month
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Conversion Rate
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.conversionRate}%</div>
						<Progress value={stats.conversionRate} className="mt-2" />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Avg Response Time
						</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.avgResponseTime}</div>
						<p className="text-xs text-muted-foreground">
							<span className="text-green-600">-15%</span> improvement
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Customers
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeCustomers}</div>
						<p className="text-xs text-muted-foreground">
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
									key={activity.id}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-3">
										<div
											className={`w-2 h-2 rounded-full ${
												activity.type === "reservation"
													? "bg-primary"
													: activity.type === "conversation"
														? "bg-chart-3"
														: "bg-destructive"
											}`}
										/>
										<div>
											<p className="font-medium">{activity.customer}</p>
											<p className="text-sm text-muted-foreground">
												{activity.time}
											</p>
										</div>
									</div>
									<Badge
										variant={
											activity.status === "confirmed"
												? "default"
												: activity.status === "completed"
													? "secondary"
													: "destructive"
										}
									>
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
								<div key={month.month} className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="font-medium">{month.month}</span>
										<span className="text-muted-foreground">
											{month.reservations + month.conversations} total
										</span>
									</div>
									<div className="grid grid-cols-3 gap-2 text-xs">
										<div className="text-center">
											<div className="text-blue-600 font-medium">
												{month.reservations}
											</div>
											<div className="text-muted-foreground">Reservations</div>
										</div>
										<div className="text-center">
											<div className="text-green-600 font-medium">
												{month.conversations}
											</div>
											<div className="text-muted-foreground">Conversations</div>
										</div>
										<div className="text-center">
											<div className="text-red-600 font-medium">
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
