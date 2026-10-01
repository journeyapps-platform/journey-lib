import { parseExpression as parseJavaScript } from '@babel/parser';
import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { AbstractToken, ExpressionSource, LiteralToken, LiteralValue, stringify } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';

export type LiteralConstantValue = LiteralValue;

/**
 * A constant string, number, boolean or null value, with tokens preserving its original syntax.
 * Examples include `'hello'`, `42`, `1e3`, `true` and `null`.
 * Parsing decodes source literals; deserialize() creates tokens from an existing value.
 *
 * @example
 * ```ts
 * ConstantExpression.parse('1e3').value(); // 1000
 * ConstantExpression.parse('null').value(); // null
 * ConstantExpression.deserialize(false).stringify(); // 'false'
 * ```
 */
export class ConstantExpression<V extends LiteralConstantValue = string> extends AbstractExpression<
  AbstractExpressionOptions<V>,
  V
> {
  static TYPE = 'constant-expression';

  static parse(source: ExpressionSource, start = 0): ConstantExpression<LiteralConstantValue> {
    return requireExpression(new ConstantExpressionParser(), source, start);
  }

  /**
   * Serialize an existing value as a literal token without parsing source text.
   *
   * @example
   * ```ts
   * TextExpression.deserialize("it's fine").stringify(); // "'it\\'s fine'"
   * PrimitiveConstantExpression.deserialize(false).value(); // false
   * ```
   */
  static deserialize<Value extends LiteralConstantValue, Expression extends ConstantExpression<Value>>(
    this: new (options: AbstractExpressionOptions<Value>) => Expression,
    value: Value,
    start = 0
  ): Expression {
    return new this({ expression: value, tokens: [LiteralToken.fromValue(value, start)] });
  }

  constructor(options: AbstractExpressionOptions<V>) {
    super(ConstantExpression.TYPE, options);
  }

  isValid(): boolean {
    return this.expression === null || ['string', 'number', 'boolean'].includes(typeof this.expression);
  }

  value(): V {
    return this.expression;
  }

  text(): string {
    return this.options.text ?? this.stringify();
  }

  async evaluatePromise(_scope: FormatStringScope): Promise<V> {
    return this.value();
  }
}

/**
 * Recognize simple literal values and delegate quoted JavaScript strings to Babel.
 */
export class ConstantExpressionParser implements ExpressionParser<ConstantExpression<LiteralConstantValue>> {
  tryParse(source: ExpressionSource, start = 0): ConstantExpression<LiteralConstantValue> | null {
    let token: LiteralToken | null = null;
    if (typeof source !== 'string' && source.length === 1 && source[0] instanceof LiteralToken) {
      token = source[0];
    } else {
      const text = stringify(source);
      const literal = text.trim();
      let value: LiteralValue | undefined;
      if (literal === 'null') {
        value = null;
      } else if (literal === 'true' || literal === 'false') {
        value = literal === 'true';
      } else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(literal)) {
        value = Number(literal);
      } else if (literal.startsWith("'") || literal.startsWith('"')) {
        const node = parseJavaScript(text);
        if (node.type === 'StringLiteral') {
          value = node.value;
        }
      }
      if (value !== undefined) {
        token = new LiteralToken(text, value, start);
      }
    }
    let expression: ConstantExpression<LiteralConstantValue> | null = null;
    if (token) {
      let tokens: readonly AbstractToken[] = [token];
      if (typeof source !== 'string') {
        tokens = source;
      }
      expression = new ConstantExpression({ expression: token.value, tokens });
    }
    return expression;
  }
}
