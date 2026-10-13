import { AbstractToken } from '../AbstractToken';
import { IdentifierToken } from './IdentifierToken';

export const FUNCTION_PREFIX = '$:';

export class PrefixToken extends AbstractToken {
  constructor(start = 0, readonly source = FUNCTION_PREFIX) {
    super(start);
    Object.freeze(this);
  }

  raw(): string {
    return this.source;
  }

  isValid(): boolean {
    return this.source.endsWith(':') && IdentifierToken.isValid(this.source.slice(0, -1));
  }

  clone(): this {
    return this;
  }
}
