export type CustomersSearchEventDetail = {
	q?: string;
	items?: Array<{ wa_id?: string; name?: string | null }>;
};
