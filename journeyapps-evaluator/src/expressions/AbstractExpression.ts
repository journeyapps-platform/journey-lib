import { AbstractToken } from '../tokens';
import type { ValidationContext } from '../definitions/ValidationContext';

export interface ExpressionDiagnostic {
  token: AbstractToken;
  message: string;
}

export interface AbstractExpressionOptions {
  start?: number;
  /**
   * Complete source tokens prepared by a parser or value factory.
   * Constructors store these tokens without interpreting their source.
   */
  tokens: readonly AbstractToken[];
}

/**
 * Shared source tokens and positions for concrete expression types.
 * Concrete types represent constant text such as `42`, references such as `user.name`,
 * evaluated code such as `$:count + 1`, or format strings such as `Hello {user.name}`.
 * raw() reproduces source syntax.
 */
export abstract class AbstractExpression<O extends AbstractExpressionOptions = AbstractExpressionOptions> {
  type: string;
  options: O;

  protected constructor(type: string, options: O) {
    this.type = type;
    this.options = {
      ...options,
      start: options.start ?? options.tokens[0]?.start ?? 0,
      tokens: Object.freeze([...options.tokens])
    };
  }

  /**
   * Check whether the stored value and tokens represent this expression type.
   */
  abstract isValid(): boolean;

  /**
   * Validate references against declarations without evaluating values.
   */
  validate(_context: ValidationContext): ExpressionDiagnostic[] {
    return [];
  }

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
  raw(): string {
    return this.tokens.map((token) => token.raw()).join('');
  }

  get start(): number | null {
    return this.options.start;
  }

  set start(start: number) {
    this.options.start = start;
  }

  toString(): string {
    return '[object ' + this.constructor.name + ' <' + this.raw() + ', ' + this.start + '>]';
  }
}
