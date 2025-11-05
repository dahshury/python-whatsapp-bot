export type DocumentSnapshot = {
  name?: string | null;
  age?: number | null;
  document?: unknown;
  updatedAt?: number;
};

import { WhatsAppId } from "@/shared/domain/value-objects/wa-id.vo";
import { DocumentTitle } from "../value-objects/document-title.vo";

export class DocumentDomain {
  private readonly _waId: WhatsAppId;
  private _snapshot: DocumentSnapshot;

  constructor(waId: string, snapshot: DocumentSnapshot = {}) {
    this._waId = new WhatsAppId(waId);
    this._snapshot = { ...snapshot };
    if (this._snapshot.name != null) {
      // normalize via VO
      const title = new DocumentTitle(String(this._snapshot.name));
      this._snapshot.name = title.value;
    }
  }

  update(partial: Partial<DocumentSnapshot>): void {
    const next: DocumentSnapshot = { ...this._snapshot, ...partial };
    if (next.name != null) {
      next.name = new DocumentTitle(String(next.name)).value;
    }
    this._snapshot = { ...next, updatedAt: Date.now() };
  }

  rename(name: string): void {
    const title = new DocumentTitle(name);
    this._snapshot = {
      ...this._snapshot,
      name: title.value,
      updatedAt: Date.now(),
    };
  }

  hasName(): boolean {
    return this._snapshot.name != null && this._snapshot.name.trim().length > 0;
  }

  hasContent(): boolean {
    return (
      this._snapshot.document !== undefined && this._snapshot.document !== null
    );
  }

  getAge(): number | undefined {
    return this._snapshot.age ?? undefined;
  }

  isStale(maxAgeMs: number): boolean {
    if (!this._snapshot.updatedAt) {
      return true;
    }
    return Date.now() - this._snapshot.updatedAt > maxAgeMs;
  }

  isEmpty(): boolean {
    return !(this.hasName() || this.hasContent());
  }

  getLastUpdated(): Date | undefined {
    return this._snapshot.updatedAt
      ? new Date(this._snapshot.updatedAt)
      : undefined;
  }

  get waId(): string {
    return this._waId.value;
  }

  get snapshot(): DocumentSnapshot {
    return this._snapshot;
  }

  get name(): string | null | undefined {
    return this._snapshot.name;
  }

  get age(): number | null | undefined {
    return this._snapshot.age;
  }

  get document(): unknown {
    return this._snapshot.document;
  }

  get updatedAt(): number | undefined {
    return this._snapshot.updatedAt;
  }
}
