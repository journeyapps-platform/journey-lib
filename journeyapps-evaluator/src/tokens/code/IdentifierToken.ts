import { AbstractToken } from '../AbstractToken';

/**
 * A single identifier with its original source position.
 */
export class IdentifierToken extends AbstractToken {
  static isValid(source: string): boolean {
    return /^[$A-Z_a-z][$\w]*$/.test(source);
  }

  constructor(readonly source: string, start = 0) {
    super(start);
    Object.freeze(this);
  }

  isValid(): boolean {
    return IdentifierToken.isValid(this.source);
  }

  raw(): string {
    return this.source;
  }

  clone(): this {
    return this;
  }
}
