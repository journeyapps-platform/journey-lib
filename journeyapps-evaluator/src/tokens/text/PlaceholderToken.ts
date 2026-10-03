import { AbstractToken } from '../AbstractToken';
import type { AbstractExpression } from '../../expressions/AbstractExpression';

/**
 * A format-string delimiter pair containing one expression.
 */
export class PlaceholderToken extends AbstractToken {
  constructor(readonly expression: AbstractExpression, start = 0) {
    super(start);
    Object.freeze(this);
  }

  get children(): readonly AbstractToken[] {
    return this.expression.tokens;
  }

  raw(): string {
    return `{${this.expression.raw()}}`;
  }

  clone(): PlaceholderToken {
    return new PlaceholderToken(this.expression.clone(), this.start);
  }
}
