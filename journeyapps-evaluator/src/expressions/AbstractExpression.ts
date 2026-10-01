import { FormatStringScope } from '../definitions/FormatStringScope';
import { AbstractToken } from '../tokens';

export interface AbstractExpressionOptions<Value = string> {
  expression: Value;
  start?: number;
  format?: string;
  /**
   * Original source text, retained separately from normalized literal values.
   */
  text?: string;
  /**
   * Complete source tokens prepared by a parser or value factory.
   * Constructors store these tokens without interpreting their source.
   */
  tokens: readonly AbstractToken[];
}

/**
 * Shared base for expressions assembled from source tokens and a resolved expression value.
 * Concrete types represent values such as `42`, references such as `user.name`,
 * evaluated code such as `$:count + 1`, or format strings such as `Hello {user.name}`.
 * stringify() reproduces source syntax; evaluatePromise() resolves the expression through a scope.
 */
export abstract class AbstractExpression<
  O extends AbstractExpressionOptions<any> = AbstractExpressionOptions<any>,
  V = any
> {
  type: string;
  expression: O['expression'];
  options: O;

  protected constructor(type: string, options: O) {
    this.type = type;
    this.options = {
      ...options,
      start: options.start ?? options.tokens[0]?.start ?? 0,
      tokens: Object.freeze([...options.tokens])
    };
    this.expression = this.options.expression;
  }

  /**
   * Check whether the stored value and tokens represent this expression type.
   */
  abstract isValid(): boolean;

  abstract evaluatePromise(scope: FormatStringScope): Promise<V>;

  clone(): this {
    const Type = this.constructor as new (options: O) => this;
    return new Type({ ...this.options, tokens: this.tokens.map((token) => token.clone()) });
  }

  get tokens(): readonly AbstractToken[] {
    return this.options.tokens;
  }

  /**
   * Reproduce source syntax, including whitespace, delimiters and escapes.
   */
  stringify(): string {
    return this.tokens.map((token) => token.stringify()).join('');
  }

  get start(): number | null {
    return this.options.start;
  }

  set start(start: number) {
    this.options.start = start;
  }

  get format(): string | null {
    return this.options.format ?? null;
  }

  /**
   * Return source text without evaluating the expression or converting it to a literal value.
   */
  text(): string {
    return this.options.text ?? String(this.options.expression);
  }

  toString(): string {
    return '[object ' + this.constructor.name + ' <' + this.expression + ', ' + this.start + '>]';
  }
}
