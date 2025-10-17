import { NotFoundPage } from "@shared/ui/not-found";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "404 - Page Not Found | Reservation Manager",
	description: "The page you're looking for doesn't exist or has been moved.",
};

export default function NotFound() {
	return <NotFoundPage />;
}
