import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { ConstantExpression, ConstantExpressionParser } from './ConstantExpression';
import { AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionSource, stringify } from '../../tokens';

export type PrimitiveConstantValue = number | boolean;

export class PrimitiveConstantExpression<
  V extends PrimitiveConstantValue = PrimitiveConstantValue
> extends ConstantExpression<V> {
  static readonly TYPE = 'primitive-constant-expression';
  static parse(source: ExpressionSource, start = 0): PrimitiveConstantExpression {
    return requireExpression(new PrimitiveConstantExpressionParser(), source, start);
  }
  constructor(options: AbstractExpressionOptions<V>) {
    super(options);
    this.type = PrimitiveConstantExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && (typeof this.expression === 'number' || typeof this.expression === 'boolean');
  }
}

/**
 * Recognize the literal syntax owned by PrimitiveConstantExpression.
 */
export class PrimitiveConstantExpressionParser implements ExpressionParser<PrimitiveConstantExpression> {
  tryParse(source: ExpressionSource, start = 0): PrimitiveConstantExpression | null {
    const constant = new ConstantExpressionParser().tryParse(source, start);
    let expression: PrimitiveConstantExpression | null = null;
    if (constant) {
      const value = constant.value();
      if (typeof value === 'number' || typeof value === 'boolean') {
        expression = new PrimitiveConstantExpression({ ...constant.options, expression: value });
      }
    }
    return expression;
  }
}

/**
 * Parse numeric attribute values while preserving their original spelling.
 */
export class NumericConstantExpressionParser implements ExpressionParser<PrimitiveConstantExpression<number>> {
  tryParse(source: ExpressionSource, start = 0): PrimitiveConstantExpression<number> | null {
    const text = stringify(source);
    const value = Number(text);
    if (Number.isNaN(value)) {
      return null;
    }
    if (typeof source !== 'string' && source.length > 0) {
      start = source[0].start;
    }
    return new PrimitiveConstantExpression({ expression: value, text, start });
  }
}
