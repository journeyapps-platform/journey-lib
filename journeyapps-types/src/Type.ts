import type { Formatter } from './Formatter';

/**
 * Describes a value independently of the scope that declares or references it.
 */
export class Type<T = any> implements Formatter {
  readonly _typeName: string;

  constructor(public name: string) {
    this._typeName = name;
  }

  /**
   * Types without a value restriction retain the existing pass-through behavior.
   */
  is(_value: unknown): boolean {
    return true;
  }

  parse(value: unknown): T {
    return value as T;
  }

  stringify(): string {
    return this.name;
  }

  valueOf(): string {
    return this.name;
  }

  toJSON(): object {
    return {};
  }

  format(value: any, format?: string): string {
    return value.toString();
  }
}
