import { TokenExpression, TokenExpressionOptions } from '../TokenExpression';
import { ConstantTokenExpression } from '../constant/ConstantTokenExpression';
import { FormatStringScope } from '../../definitions/FormatStringScope';

export interface FunctionTokenExpressionOptions extends TokenExpressionOptions {
  name?: string;
  arguments?: TokenExpression[];
}

export class FunctionTokenExpression extends TokenExpression<FunctionTokenExpressionOptions> {
  /**
   * Prefix for function token expressions.
   */
  static PREFIX = '$:';

  constructor(expression: string, options?: FunctionTokenExpressionOptions) {
    super(expression.trim(), { ...options, isFunction: true });
    // remove indicator prefix from expression
    const prefix = FunctionTokenExpression.PREFIX;
    if (this.expression.indexOf(prefix) === 0) {
      this.expression = this.expression.slice(prefix.length);
    }
    this.options.name = this.options.name ?? this.expression.slice(0, this.expression.indexOf('('));
    this.options.arguments = this.options.arguments ?? [];
  }

  get arguments() {
    return this.options.arguments;
  }

  functionName(): string {
    return this.options.name;
  }

  /**
   * Generate a constant token expression from function token expression.
   * @param {boolean} [includeEscapeTags] if "{" and "}" format string escape tags should be included or not
   */
  toConstant(includeEscapeTags: boolean = false): ConstantTokenExpression {
    let constantExpression = FunctionTokenExpression.PREFIX + this.expression;
    if (includeEscapeTags) {
      constantExpression = '{' + constantExpression + '}';
    }
    return new ConstantTokenExpression(constantExpression, { start: this.start });
  }

  async tokenEvaluatePromise(scope: FormatStringScope) {
    return scope.evaluateFunctionExpression(this.expression);
  }

  stringify() {
    return `${this.functionName()}(${this.arguments.map((arg) => arg.stringify()).join(', ')})`;
  }
}
