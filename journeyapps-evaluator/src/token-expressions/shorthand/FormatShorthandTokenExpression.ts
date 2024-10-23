/**
 * Shorthand token expression with format specifier.
 */
import { ShorthandTokenExpression, ShorthandTokenExpressionOptions } from './ShorthandTokenExpression';

export interface FormatShorthandTokenExpressionOptions extends ShorthandTokenExpressionOptions {
  format: string;
}

/**
 * asset.price:.2f
 */
export class FormatShorthandTokenExpression extends ShorthandTokenExpression<FormatShorthandTokenExpressionOptions> {
  static readonly TYPE = 'format-shorthand-expression';
  constructor(options: FormatShorthandTokenExpressionOptions) {
    super(options);
    this.type = FormatShorthandTokenExpression.TYPE;
  }

  stringify(): string {
    return `${super.stringify()}:${this.options.format}`;
  }

  toString() {
    return '[object ' + this.constructor.name + ' <' + this.expression + ', ' + this.start + ', ' + this.format + '>]';
  }
}
