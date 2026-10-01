import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { ConstantExpression, LiteralConstantValue, ConstantExpressionParser } from '../constant/ConstantExpression';
import { AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionSource, TextToken, stringify } from '../../tokens';

export class TextExpression extends ConstantExpression<string> {
  static TYPE = 'text-expression';
  static parse(source: ExpressionSource, start = 0): TextExpression {
    return requireExpression(new TextExpressionParser(), source, start);
  }
  constructor(options: AbstractExpressionOptions<string>) {
    super(options);
    this.type = TextExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && typeof this.expression === 'string';
  }
  text(): string {
    return this.value();
  }
  concat(value: ConstantExpression<LiteralConstantValue>): TextExpression {
    return new TextExpression({ expression: this.value() + String(value.value()), start: this.start });
  }
}

/**
 * Recognize the literal syntax owned by TextExpression.
 */
export class TextExpressionParser implements ExpressionParser<TextExpression> {
  constructor(readonly quotedOnly = false) {}
  tryParse(source: ExpressionSource, start = 0): TextExpression | null {
    let expression: TextExpression | null = null;
    if (!this.quotedOnly && typeof source === 'string' && !/^\s*['"]/.test(source)) {
      expression = new TextExpression({ expression: source, tokens: [new TextToken(source, start)] });
    } else if (
      !this.quotedOnly &&
      typeof source !== 'string' &&
      source.length === 1 &&
      source[0] instanceof TextToken
    ) {
      expression = new TextExpression({ expression: source[0].source, tokens: source });
    } else {
      const constant = new ConstantExpressionParser().tryParse(source, start);
      if (constant) {
        const value = constant.value();
        if (typeof value === 'string') {
          expression = new TextExpression({ ...constant.options, expression: value });
        }
      }
    }
    return expression;
  }
}

/**
 * Preserve source as a text value without decoding JavaScript literal syntax.
 * Use this as the final parser when unmatched attribute syntax should remain literal text.
 */
export class RawTextExpressionParser implements ExpressionParser<TextExpression> {
  tryParse(source: ExpressionSource, start = 0): TextExpression {
    const text = stringify(source);
    if (typeof source !== 'string' && source.length > 0) {
      start = source[0].start;
    }
    return new TextExpression({ expression: text, tokens: [new TextToken(text, start)] });
  }
}
