import type React from "react";

export function GridView({
	wrapperClass,
	children,
}: {
	wrapperClass: string;
	children: React.ReactNode;
}) {
	return <div className={wrapperClass}>{children}</div>;
}
