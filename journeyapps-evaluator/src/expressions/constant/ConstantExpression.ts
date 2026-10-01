import { parseExpression as parseJavaScript } from '@babel/parser';
import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { AbstractToken, ExpressionSource, LiteralToken, LiteralValue, stringify } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';

export type LiteralConstantValue = LiteralValue;

/**
 * A typed constant value and its original source token.
 */
export class ConstantExpression<V extends LiteralConstantValue = string> extends AbstractExpression<
  AbstractExpressionOptions<V>,
  V
> {
  static TYPE = 'constant-expression';

  static parse(source: ExpressionSource, start = 0): ConstantExpression<LiteralConstantValue> {
    return requireExpression(new ConstantExpressionParser(), source, start);
  }

  constructor(options: AbstractExpressionOptions<V>) {
    let text = options.text;
    let tokens = options.tokens;
    if (text == null && tokens != null) {
      text = stringify(tokens);
    }
    if (tokens == null) {
      let token: LiteralToken;
      if (options.text == null) {
        token = LiteralToken.fromValue(options.expression, options.start ?? 0);
      } else {
        token = new LiteralToken(options.text, options.expression, options.start ?? 0);
      }
      tokens = [token];
    }
    super(ConstantExpression.TYPE, { ...options, text, tokens });
  }
  isValid(): boolean {
    return this.expression === null || ['string', 'number', 'boolean'].includes(typeof this.expression);
  }

  value(): V {
    return this.expression;
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
