import { AbstractToken } from '../AbstractToken';

export const FUNCTION_PREFIX = '$:';

export class PrefixToken extends AbstractToken {
  constructor(start = 0) {
    super(start);
    Object.freeze(this);
  }

  raw(): string {
    return FUNCTION_PREFIX;
  }

  clone(): this {
    return this;
  }
}
