import { FormatStringScope } from '../definitions/FormatStringScope';

export interface TokenExpressionOptions {
  expression: string;
  start?: number;
  format?: string;
  isPrimitive?: boolean;
  isConstant?: boolean;
  isShorthand?: boolean;
  /**
   * If the token expression is a function that needs to be called or not.
   */
  isFunction?: boolean;
  isComputed?: boolean;
}

export abstract class TokenExpression<O extends TokenExpressionOptions = TokenExpressionOptions, V extends any = any> {
  type: string;
  expression: string;
  options: O;
  isPrimitive: boolean;

  protected constructor(type: string, options: O) {
    if (this.constructor === TokenExpression) {
      throw new Error('Cannot instantiate abstract TokenExpression class!');
    }
    this.type = type;
    this.options = {
      isPrimitive: false,
      isConstant: false,
      isShorthand: false,
      isFunction: false,
      isComputed: false,
      ...options
    };
    this.expression = this.options.expression;
    this.isPrimitive = this.options.isPrimitive;
  }

  abstract tokenEvaluatePromise(scope: FormatStringScope): Promise<V>;

  abstract clone(): this;

  get start(): number | null {
    return this.options.start;
  }

  set start(start: number) {
    this.options.start = start;
  }

  get format(): string | null {
    return this.options.format ?? null;
  }

  isConstant(): boolean {
    return this.options.isConstant;
  }

  isShorthand(): boolean {
    return this.options.isShorthand;
  }

  isFunction(): boolean {
    return this.options.isFunction;
  }

  stringify() {
    return this.expression;
  }

  toString(): string {
    return '[object ' + this.constructor.name + ' <' + this.expression + ', ' + this.start + '>]';
  }
}
