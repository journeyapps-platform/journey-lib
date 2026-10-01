import { AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { ShorthandExpression, ShorthandExpressionParser } from './ShorthandExpression';
import { AbstractToken, ExpressionSource, TextToken, stringify } from '../../tokens';

export interface FormatShorthandExpressionOptions extends AbstractExpressionOptions {
  format: string;
}

/**
 * A shorthand reference with a format specifier, such as `price:.2f`.
 * Commonly used inside a format-string placeholder, for example `{price:.2f}`.
 * The scope resolves the reference before the format specifier is applied to its value.
 *
 * @example
 * ```ts
 * const expression = FormatShorthandExpression.parse('price:.2f');
 * expression.expression; // 'price'
 * expression.format; // '.2f'
 * expression.stringify(); // 'price:.2f'
 * ```
 */
export class FormatShorthandExpression extends ShorthandExpression<FormatShorthandExpressionOptions> {
  static readonly TYPE = 'format-shorthand-expression';

  static parse(source: ExpressionSource, start = 0): FormatShorthandExpression {
    return requireExpression(new FormatShorthandExpressionParser(), source, start);
  }

  constructor(options: FormatShorthandExpressionOptions) {
    super(options);
    this.type = FormatShorthandExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && typeof this.format === 'string' && /^[\w.]+$/.test(this.format);
  }

  text(): string {
    return `${this.expression}:${this.format}`;
  }
}

/**
 * Recognize the syntax owned by FormatShorthandExpression.
 */
export class FormatShorthandExpressionParser implements ExpressionParser<FormatShorthandExpression> {
  tryParse(source: ExpressionSource, start = 0): FormatShorthandExpression | null {
    const text = stringify(source);
    const match = text.match(/:\s*([\w.]+)\s*$/);
    let expression: FormatShorthandExpression | null = null;
    if (match) {
      const reference = text.slice(0, match.index);
      const shorthand = new ShorthandExpressionParser().tryParse(reference, start);
      if (shorthand) {
        let tokens: readonly AbstractToken[];
        if (typeof source === 'string') {
          tokens = [...shorthand.tokens, new TextToken(text.slice(match.index), start + match.index)];
        } else {
          tokens = source;
        }
        expression = new FormatShorthandExpression({ expression: shorthand.expression, format: match[1], tokens });
      }
    }
    return expression;
  }
}
