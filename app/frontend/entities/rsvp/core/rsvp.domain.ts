import type { RSVP } from "../types/rsvp.types";
import { RSVPStatus } from "../types/rsvp.types";
import { RsvpStatusVO } from "../value-objects";

export class RsvpDomain {
  private _data: RSVP;
  private _status: RsvpStatusVO;

  constructor(data: RSVP) {
    this._status = new RsvpStatusVO(data.status);
    this._data = data;
  }

  setStatus(status: RSVPStatus): void {
    const newStatus = new RsvpStatusVO(status);
    this._status = newStatus;
    this._data = { ...this._data, status, updatedAt: new Date().toISOString() };
  }

  confirm(): void {
    this.setStatus(RSVPStatus.CONFIRMED);
  }

  cancel(): void {
    this.setStatus(RSVPStatus.CANCELLED);
  }

  decline(): void {
    this.setStatus(RSVPStatus.DECLINED);
  }

  markPending(): void {
    this.setStatus(RSVPStatus.PENDING);
  }

  isPending(): boolean {
    return this._status.isPending();
  }

  isConfirmed(): boolean {
    return this._status.isConfirmed();
  }

  isCancelled(): boolean {
    return this._status.isCancelled();
  }

  isDeclined(): boolean {
    return this._status.isDeclined();
  }

  canModify(): boolean {
    return !(this.isCancelled() || this.isDeclined());
  }

  get value(): RSVP {
    return this._data;
  }

  get id(): string | number {
    return this._data.id;
  }

  get eventId(): string {
    return this._data.eventId;
  }

  get customerId(): string {
    return this._data.customerId;
  }

  get status(): RSVPStatus {
    return this._data.status;
  }

  get createdAt(): string {
    return this._data.createdAt;
  }

  get updatedAt(): string | undefined {
    return this._data.updatedAt;
  }
}
