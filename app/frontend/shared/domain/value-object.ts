export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = this.deepFreeze(value);
  }

  private deepFreeze<U>(obj: U): U {
    if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
      Object.freeze(obj as object);
      for (const key of Object.getOwnPropertyNames(obj as object)) {
        const val = (obj as Record<string, unknown>)[key];
        if (
          val !== null &&
          (typeof val === "object" || typeof val === "function") &&
          !Object.isFrozen(val as object)
        ) {
          this.deepFreeze(val);
        }
      }
    }
    return obj;
  }

  protected abstract validate(value: T): void;

  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return this.equalsValue(other._value);
  }

  protected equalsValue(value: T): boolean {
    if (typeof this._value === "object" && this._value !== null) {
      try {
        return JSON.stringify(this._value) === JSON.stringify(value);
      } catch {
        return false;
      }
    }
    return this._value === (value as unknown);
  }

  get value(): T {
    return this._value;
  }
}
