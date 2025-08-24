export interface CustomerAutoFillConfig {
	phoneColumnId?: string;
	nameColumnId?: string;
	onNameUpdate?: (rowIndex: number, customerName: string) => void;
}

export class CustomerAutoFillService {
	private static instance: CustomerAutoFillService;
	private config: CustomerAutoFillConfig = {};

	static getInstance(): CustomerAutoFillService {
		if (!CustomerAutoFillService.instance) {
			CustomerAutoFillService.instance = new CustomerAutoFillService();
		}
		return CustomerAutoFillService.instance;
	}

	configure(config: CustomerAutoFillConfig): void {
		this.config = { ...this.config, ...config };
	}

	createCustomerSelectHandler(rowIndex: number) {
		return (phone: string, customerName?: string) => {
			console.log(
				"CustomerAutoFillService createCustomerSelectHandler called with:",
				phone,
				customerName,
				"rowIndex:",
				rowIndex,
			);
			console.log("CustomerAutoFillService config:", this.config);

			if (customerName && this.config.onNameUpdate) {
				console.log(
					"Calling onNameUpdate with rowIndex:",
					rowIndex,
					"customerName:",
					customerName,
				);
				this.config.onNameUpdate(rowIndex, customerName);
			} else {
				console.log(
					"Not calling onNameUpdate. customerName:",
					customerName,
					"onNameUpdate available:",
					!!this.config.onNameUpdate,
				);
			}
		};
	}

	getConfig(): CustomerAutoFillConfig {
		return { ...this.config };
	}

	reset(): void {
		this.config = {};
	}
}

export const customerAutoFillService = CustomerAutoFillService.getInstance();
