/**
 * Constant token expression.
 */
import { TokenExpression, TokenExpressionOptions } from '../TokenExpression';
import { FormatStringScope } from '../../definitions/FormatStringScope';

export class ConstantTokenExpression extends TokenExpression {
  constructor(expression: string, options?: TokenExpressionOptions) {
    super(expression, { ...options, isConstant: true });
  }

  /**
   * Concatenate a token to current token and return a new token.
   */
  concat(token: ConstantTokenExpression): ConstantTokenExpression {
    // start value should be start of first token
    return new ConstantTokenExpression(this.expression.concat(token.expression), { start: this.start });
  }

  /**
   * Get the value of the constant token expression.
   */
  valueOf(): string {
    return this.expression;
  }

  async tokenEvaluatePromise(scope: FormatStringScope) {
    return this.expression;
  }
}