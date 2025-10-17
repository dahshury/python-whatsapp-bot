import { useEffect } from "react";

export function useRowCountSync(
	setNumRows: (n: number) => void,
	rowCount: number
): void {
	useEffect(() => {
		setNumRows(rowCount);
	}, [rowCount, setNumRows]);
}
