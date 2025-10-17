"use client";

import { Button } from "@ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@ui/empty";
import { Compass, Home } from "lucide-react";
import { useEffect, useState } from "react";

export function NotFoundPage() {
	const [isLocalized, setIsLocalized] = useState(false);

	// Lightweight language detection without heavy context providers
	useEffect(() => {
		try {
			const locale = localStorage.getItem("locale");
			setIsLocalized(
				locale === "ar" || localStorage.getItem("isLocalized") === "true"
			);
		} catch {
			// Ignore localStorage errors
		}
	}, []);

	const text = {
		description: isLocalized
			? "الصفحة التي تبحث عنها قد تم نقلها أو غير موجودة."
			: "The page you're looking for might have been moved or doesn't exist.",
		goHome: isLocalized ? "العودة للرئيسية" : "Go Home",
		explore: isLocalized ? "استكشاف" : "Explore",
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
			<div className="flex items-center border-x">
				<div>
					<div className="absolute inset-x-0 h-px bg-border" />
					<Empty>
						<EmptyHeader>
							<EmptyTitle className="font-black font-mono text-8xl">
								404
							</EmptyTitle>
							<EmptyDescription className="text-nowrap">
								{text.description}
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex gap-2">
								<Button asChild>
									<a href="/">
										<Home /> {text.goHome}
									</a>
								</Button>

								<Button asChild variant="outline">
									<a href="/">
										<Compass /> {text.explore}
									</a>
								</Button>
							</div>
						</EmptyContent>
					</Empty>
					<div className="absolute inset-x-0 h-px bg-border" />
				</div>
			</div>
		</div>
	);
}
