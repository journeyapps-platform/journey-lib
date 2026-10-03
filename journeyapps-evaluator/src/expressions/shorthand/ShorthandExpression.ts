import { ExpressionParser } from '../../ExpressionParser';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { AbstractToken, CodeToken, codeToken, ExpressionSource, JSToken } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';
import { formatValueAsync } from '../../utils/formatStringUtils';

export interface ShorthandExpressionOptions extends AbstractExpressionOptions {
  format?: string;
}

/**
 * A reference resolved through the scope without an evaluation prefix.
 * Examples include `user.name`, `items[0].name` and `user['name']`.
 * Bare arithmetic and root function calls are not shorthand references.
 *
 * @example
 * ```ts
 * ShorthandExpression.parse('user.name').path; // 'user.name'
 * ShorthandExpression.parse('items[0].name').raw(); // 'items[0].name'
 * ```
 */
export class ShorthandExpression<
  O extends ShorthandExpressionOptions = ShorthandExpressionOptions
> extends AbstractExpression<O> {
  static TYPE = 'shorthand-expression';

  static parse(source: ExpressionSource, start = 0): ShorthandExpression {
    return new ShorthandExpressionParser().parse(source, start);
  }

  constructor(options: O) {
    super(ShorthandExpression.TYPE, options);
  }

  get format(): string | null {
    return this.options.format ?? null;
  }

  get codeToken(): CodeToken {
    return codeToken(this.tokens);
  }

  isValid(): boolean {
    const code = this.tokens.filter((token): token is CodeToken => token instanceof CodeToken);
    return code.length === 1 && code[0].isReferenceExpression();
  }

  get path(): string {
    return this.codeToken.code;
  }

  async evaluatePromise(scope: FormatStringScope) {
    const value = await scope.getValuePromise(this.path);
    return formatValueAsync(value, scope.getExpressionType(this.path), this.format);
  }
}

/**
 * Recognize the syntax owned by ShorthandExpression.
 */
export class ShorthandExpressionParser extends ExpressionParser<ShorthandExpression> {
  tryParse(source: ExpressionSource, start = 0): ShorthandExpression | null {
    let expression: ShorthandExpression | null = null;
    try {
      let tokens: readonly AbstractToken[];
      if (typeof source === 'string') {
        tokens = [new JSToken(source, start)];
      } else {
        tokens = source;
      }
      const candidate = new ShorthandExpression({
        tokens
      });
      if (candidate.isValid()) {
        expression = candidate;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
    return expression;
  }
}
