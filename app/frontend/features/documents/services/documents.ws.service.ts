import { wsAdapter } from '@/shared/infrastructure'

export async function requestDocumentLoad(waId: string): Promise<boolean> {
	try {
		return await wsAdapter.send({
			type: 'get_customer_document',
			data: { wa_id: waId },
		})
	} catch {
		return false
	}
}
