type IsVacationDate = ((ymd: string) => boolean) | undefined;

export function createSelectAllow(args: { isVacationDate: IsVacationDate }) {
	const { isVacationDate } = args;
	return (info: { startStr?: string; endStr?: string }) => {
		try {
			const startStr: string | undefined = info?.startStr;
			const endStr: string | undefined = info?.endStr;
			if (!(startStr && endStr)) {
				return true;
			}
			const start = new Date(startStr);
			const end = new Date(endStr);
			const cur = new Date(start);
			while (cur < end) {
				const yyyy = cur.getFullYear();
				const mm = String(cur.getMonth() + 1).padStart(2, "0");
				const dd = String(cur.getDate()).padStart(2, "0");
				const dateOnly = `${yyyy}-${mm}-${dd}`;
				if (isVacationDate?.(dateOnly)) {
					return false;
				}
				cur.setDate(cur.getDate() + 1);
			}
		} catch {
			// Selection validation may fail in some contexts
		}
		return true;
	};
}
