import { ExpressionParser } from '../../ExpressionParser';
import { AbstractExpression, AbstractExpressionOptions, ExpressionDiagnostic } from '../AbstractExpression';
import { AbstractToken, CodeToken, codeToken, ExpressionSource, JSToken, ReferencePath } from '../../tokens';
import type { ValidationContext } from '../../definitions/ValidationContext';
import type { Type } from '@ja-platform/types';

export interface ShorthandExpressionOptions extends AbstractExpressionOptions {
  format?: string;
}

/**
 * A reference resolved through the scope without an evaluation prefix.
 * Examples include `user.name`, `items[0].name` and `user['name']`.
 * Dynamic keys, call receivers, optional chains and arithmetic are not shorthand references.
 *
 * @example
 * ```ts
 * ShorthandExpression.parse('user.name').path; // ['user', 'name']
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
    return code.length === 1 && code[0].referencePath() != null;
  }

  get path(): ReferencePath {
    const path = this.codeToken.referencePath();
    if (path == null) throw new TypeError('Shorthand expressions require a static reference path.');
    return path;
  }

  /**
   * Resolve the referenced type without evaluating its value or retaining the result.
   */
  resolveType(context: ValidationContext): Type | null {
    return context.getReference(this.path);
  }

  /**
   * Report an unresolved reference using its original source token.
   */
  validate(context: ValidationContext): ExpressionDiagnostic[] {
    if (this.resolveType(context) != null) {
      return [];
    }
    return [{ token: this.codeToken, message: `'${this.codeToken.code}' is not defined` }];
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
