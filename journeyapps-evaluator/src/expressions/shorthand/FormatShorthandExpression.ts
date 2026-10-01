import { AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { ShorthandExpression, ShorthandExpressionParser } from './ShorthandExpression';
import { AbstractToken, ExpressionSource, TextToken, stringify } from '../../tokens';

export interface FormatShorthandExpressionOptions extends AbstractExpressionOptions {
  format: string;
}

export class FormatShorthandExpression extends ShorthandExpression<FormatShorthandExpressionOptions> {
  static readonly TYPE = 'format-shorthand-expression';
  static parse(source: ExpressionSource, start = 0): FormatShorthandExpression {
    return requireExpression(new FormatShorthandExpressionParser(), source, start);
  }
  constructor(options: FormatShorthandExpressionOptions) {
    super(options);
    if (options.tokens == null) {
      this.options.tokens = Object.freeze([
        ...this.tokens,
        new TextToken(`:${options.format}`, (options.start ?? 0) + options.expression.length)
      ]);
    }
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
        expression = new FormatShorthandExpression({ expression: reference, format: match[1], tokens });
      }
    }
    return expression;
  }
}
