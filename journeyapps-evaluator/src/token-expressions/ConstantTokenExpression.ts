/**
 * Constant token expression.
 */
import { TokenExpression } from './TokenExpression';
import { FormatStringScope } from '../FormatStringScope';

export class ConstantTokenExpression extends TokenExpression {
  constructor(expression: string, start?: number) {
    super(expression, start);
  }

  /**
   * Concatenate a token to current token and return a new token.
   */
  concat(token: ConstantTokenExpression): ConstantTokenExpression {
    // start value should be start of first token
    return new ConstantTokenExpression(this.expression + token.expression, this.start);
  }

  isConstant() {
    return true;
  }

  /**
   * Get the value of the constant token expression.
   */
  valueOf(): string {
    return this.expression;
  }

  async tokenEvaluatePromise(scope: FormatStringScope): Promise<string> {
    return this.expression;
  }
}
