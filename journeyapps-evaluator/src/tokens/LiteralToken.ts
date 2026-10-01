import { AbstractToken } from './AbstractToken';

export type LiteralValue = string | number | boolean | null;

/**
 * A literal's value and original spelling, without a JavaScript AST.
 */
export class LiteralToken extends AbstractToken {
  static fromValue(value: LiteralValue, start = 0): LiteralToken {
    let source: string;
    if (typeof value === 'string') {
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
      source = "'" + escaped + "'";
    } else {
      source = String(value);
    }
    return new LiteralToken(source, value, start);
  }

  constructor(readonly source: string, readonly value: LiteralValue, start = 0) {
    super(start);
    Object.freeze(this);
  }

  stringify(): string {
    return this.source;
  }

  clone(): this {
    return this;
  }
}
