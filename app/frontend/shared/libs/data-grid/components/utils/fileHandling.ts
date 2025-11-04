import { isNullOrUndefined, toSafeString } from './generalUtils'

const CSV_DELIMITER = ','
const CSV_QUOTE_CHAR = '"'
const CSV_ESCAPE_CHAR = '"'
const CSV_ROW_DELIMITER = '\n'
const CSV_UTF8_BOM = '\ufeff'
const CSV_SPECIAL_CHARS_REGEX = new RegExp(
	`[${[CSV_DELIMITER, CSV_QUOTE_CHAR, CSV_ROW_DELIMITER].join('')}]`
)
const ISO_TIMESTAMP_SLICE_LENGTH = 16
const TIMESTAMP_TIME_SEPARATOR = ':'
const TIMESTAMP_FILENAME_SEPARATOR = '-'
const BYTES_PER_KIB = 1024
const DEFAULT_MAX_FILE_SIZE_MB = 10
const DEFAULT_MAX_FILE_SIZE_BYTES =
	DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_KIB * BYTES_PER_KIB

export function escapeCSVValue(value: unknown): string {
	if (isNullOrUndefined(value)) {
		return ''
	}
	const strValue = toSafeString(value)

	if (CSV_SPECIAL_CHARS_REGEX.test(strValue)) {
		return `${CSV_QUOTE_CHAR}${strValue.replace(
			new RegExp(CSV_QUOTE_CHAR, 'g'),
			CSV_ESCAPE_CHAR + CSV_QUOTE_CHAR
		)}${CSV_QUOTE_CHAR}`
	}

	return strValue
}

export function createCSVRow(rowValues: unknown[]): string {
	return (
		rowValues.map((cell) => escapeCSVValue(cell)).join(CSV_DELIMITER) +
		CSV_ROW_DELIMITER
	)
}

export function createDownloadLink(options: {
	url: string
	filename: string
	enforceNewTab?: boolean
}): HTMLAnchorElement {
	const { url, filename, enforceNewTab = false } = options

	const link = document.createElement('a')
	link.href = url
	link.download = filename

	if (enforceNewTab) {
		link.target = '_blank'
		link.rel = 'noopener noreferrer'
	}

	return link
}

export async function writeCSVToStream(
	writer: WritableStreamDefaultWriter,
	data: unknown[][],
	headers: string[]
): Promise<void> {
	const textEncoder = new TextEncoder()

	await writer.write(textEncoder.encode(CSV_UTF8_BOM))
	await writer.write(textEncoder.encode(createCSVRow(headers)))

	for (const row of data) {
		await writer.write(textEncoder.encode(createCSVRow(row)))
	}

	await writer.close()
}

export class FileExporter {
	private readonly enforceDownloadInNewTab: boolean

	constructor(enforceDownloadInNewTab = false) {
		this.enforceDownloadInNewTab = enforceDownloadInNewTab
	}

	async exportToCSV(
		data: unknown[][],
		headers: string[],
		filename?: string
	): Promise<void> {
		const timestamp = new Date()
			.toISOString()
			.slice(0, ISO_TIMESTAMP_SLICE_LENGTH)
			.replace(TIMESTAMP_TIME_SEPARATOR, TIMESTAMP_FILENAME_SEPARATOR)
		const suggestedName = filename || `${timestamp}_export.csv`

		// Browser capabilities are not used here; if needed later, re-enable.

		try {
			await this.fallbackCSVExport(data, headers, suggestedName)
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				return
			}
			await this.fallbackCSVExport(data, headers, suggestedName)
		}
	}

	private fallbackCSVExport(
		data: unknown[][],
		headers: string[],
		filename: string
	): Promise<void> {
		let csvContent = CSV_UTF8_BOM
		csvContent += createCSVRow(headers)

		for (const row of data) {
			csvContent += createCSVRow(row)
		}

		const blob = new Blob([csvContent], {
			type: 'text/csv;charset=utf-8;',
		})
		const url = URL.createObjectURL(blob)

		const link = createDownloadLink({
			url,
			filename,
			enforceNewTab: this.enforceDownloadInNewTab,
		})

		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		URL.revokeObjectURL(url)
		return Promise.resolve()
	}

	exportToJSON(data: unknown, filename?: string): Promise<void> {
		const timestamp = new Date()
			.toISOString()
			.slice(0, ISO_TIMESTAMP_SLICE_LENGTH)
			.replace(TIMESTAMP_TIME_SEPARATOR, TIMESTAMP_FILENAME_SEPARATOR)
		const suggestedName = filename || `${timestamp}_export.json`

		const jsonContent = JSON.stringify(data, null, 2)
		const blob = new Blob([jsonContent], {
			type: 'application/json;charset=utf-8;',
		})
		const url = URL.createObjectURL(blob)

		const link = createDownloadLink({
			url,
			filename: suggestedName,
			enforceNewTab: this.enforceDownloadInNewTab,
		})

		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)

		URL.revokeObjectURL(url)
		return Promise.resolve()
	}
}

export class FileUploader {
	private readonly allowedTypes: string[]
	private readonly maxFileSize: number

	constructor(
		allowedTypes: string[] = [],
		maxFileSize: number = DEFAULT_MAX_FILE_SIZE_BYTES
	) {
		this.allowedTypes = allowedTypes
		this.maxFileSize = maxFileSize
	}

	selectFile(multiple = false): Promise<File[]> {
		return new Promise((resolve, reject) => {
			const input = document.createElement('input')
			input.type = 'file'
			input.multiple = multiple

			if (this.allowedTypes.length > 0) {
				input.accept = this.allowedTypes.join(',')
			}

			input.onchange = (event) => {
				const target = event.target as HTMLInputElement
				const files = Array.from(target.files || [])

				const validFiles = files.filter((file) => {
					if (file.size > this.maxFileSize) {
						return false
					}

					if (
						this.allowedTypes.length > 0 &&
						!this.allowedTypes.includes(file.type)
					) {
						return false
					}

					return true
				})

				resolve(validFiles)
			}

			input.onerror = () => {
				reject(new Error('File selection failed'))
			}

			input.click()
		})
	}

	readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = (event) => {
				resolve(event.target?.result as string)
			}
			reader.onerror = () => {
				reject(new Error(`Failed to read file: ${file.name}`))
			}
			reader.readAsText(file)
		})
	}

	readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = (event) => {
				resolve(event.target?.result as ArrayBuffer)
			}
			reader.onerror = () => {
				reject(new Error(`Failed to read file: ${file.name}`))
			}
			reader.readAsArrayBuffer(file)
		})
	}

	parseCSV(csvContent: string): string[][] {
		const lines = csvContent.split(CSV_ROW_DELIMITER)
		const result: string[][] = []

		for (const line of lines) {
			if (line.trim() === '') {
				continue
			}

			const row: string[] = []
			let current = ''
			let inQuotes = false

			for (let i = 0; i < line.length; i += 1) {
				const char = line[i]

				if (char === CSV_QUOTE_CHAR) {
					if (inQuotes && line[i + 1] === CSV_QUOTE_CHAR) {
						current += CSV_QUOTE_CHAR
						i += 1
					} else {
						inQuotes = !inQuotes
					}
				} else if (char === CSV_DELIMITER && !inQuotes) {
					row.push(current)
					current = ''
				} else {
					current += char
				}
			}

			row.push(current)
			result.push(row)
		}

		return result
	}
}
