export type DocGridApi =
	| {
			updateCells?: (cells: { cell: [number, number] }[]) => void;
	  }
	| undefined;

export function getDocGridApi(): DocGridApi {
	return (
		window as unknown as {
			__docGridApi?: DocGridApi;
		}
	).__docGridApi;
}
