export type UserEntityProps = {
	id: string
	waId: string
	name?: string | undefined
	phone: string
	email?: string | undefined
	language?: 'en' | 'ar' | undefined
	notifications?: boolean | undefined
	timezone?: string | undefined
	createdAt: number
	updatedAt?: number | undefined
}

import { WhatsAppId } from '@/shared/domain/value-objects/wa-id.vo'
import { UserEmail } from '../value-objects/user-email.vo'
import { UserPhone } from '../value-objects/user-phone.vo'

export class UserDomain {
	private readonly _id: string
	private readonly _waId: WhatsAppId
	private _name?: string | undefined
	private _phone: UserPhone
	private _email?: UserEmail | undefined
	private _language?: 'en' | 'ar' | undefined
	private _notifications?: boolean | undefined
	private _timezone?: string | undefined
	private readonly _createdAt: number
	private _updatedAt?: number | undefined

	constructor(props: UserEntityProps) {
		this._id = props.id
		this._waId = new WhatsAppId(props.waId)
		this._name = props.name
		this._phone = new UserPhone(props.phone)
		this._email = props.email ? new UserEmail(props.email) : undefined
		this._language = props.language
		this._notifications = props.notifications
		this._timezone = props.timezone
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
	}

	updateProfile(
		updates: Partial<Omit<UserEntityProps, 'id' | 'waId' | 'createdAt'>>
	): void {
		if (updates.name !== undefined) {
			this._name = updates.name
		}
		if (updates.phone !== undefined) {
			this._phone = new UserPhone(updates.phone)
		}
		if (updates.email !== undefined) {
			this._email = updates.email ? new UserEmail(updates.email) : undefined
		}
		if (updates.language !== undefined) {
			this._language = updates.language
		}
		if (updates.notifications !== undefined) {
			this._notifications = updates.notifications
		}
		if (updates.timezone !== undefined) {
			this._timezone = updates.timezone
		}
		this._updatedAt = Date.now()
	}

	enableNotifications(): void {
		this._notifications = true
		this._updatedAt = Date.now()
	}

	disableNotifications(): void {
		this._notifications = false
		this._updatedAt = Date.now()
	}

	setLanguage(language: 'en' | 'ar'): void {
		this._language = language
		this._updatedAt = Date.now()
	}

	setTimezone(timezone?: string): void {
		this._timezone = timezone
		this._updatedAt = Date.now()
	}

	updateEmail(email?: string): void {
		this._email = email ? new UserEmail(email) : undefined
		this._updatedAt = Date.now()
	}

	updatePhone(phone: string): void {
		this._phone = new UserPhone(phone)
		this._updatedAt = Date.now()
	}

	hasEmail(): boolean {
		return this._email !== undefined
	}

	hasName(): boolean {
		return this._name !== undefined && this._name.trim().length > 0
	}

	isNotificationsEnabled(): boolean {
		return this._notifications === true
	}

	isEnglish(): boolean {
		return this._language === 'en'
	}

	isArabic(): boolean {
		return this._language === 'ar'
	}

	getDisplayName(): string {
		if (this.hasName()) {
			return this._name as string
		}
		return this._phone.value
	}

	isProfileComplete(): boolean {
		return this.hasName() && this.hasEmail() && this._timezone !== undefined
	}

	get id() {
		return this._id
	}
	get waId() {
		return this._waId.value
	}
	get name() {
		return this._name
	}
	get phone() {
		return this._phone.value
	}
	get email() {
		return this._email?.value
	}
	get language() {
		return this._language
	}
	get notifications() {
		return this._notifications
	}
	get timezone() {
		return this._timezone
	}
	get createdAt() {
		return this._createdAt
	}
	get updatedAt() {
		return this._updatedAt
	}
}
