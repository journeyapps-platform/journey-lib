import { ExpressionParser } from '../../ExpressionParser';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionSource, TextToken, stringify } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';
import { TextType, ValueType } from '../../definitions/ValueType';

export interface ConstantExpressionOptions<T> extends AbstractExpressionOptions {
  value: T;
  valueType: ValueType<T>;
}

/**
 * A constant with an explicitly selected value type and preserved source syntax.
 * The caller selects the value type; types are never inferred from the source.
 */
export class ConstantExpression<T = string> extends AbstractExpression<ConstantExpressionOptions<T>, T> {
  static TYPE = 'constant-expression';

  static parse<T>(source: ExpressionSource, valueType: ValueType<T>, start = 0): ConstantExpression<T> {
    return new ConstantExpressionParser(valueType).parse(source, start);
  }

  constructor(options: ConstantExpressionOptions<T>) {
    super(ConstantExpression.TYPE, options);
  }

  get valueType(): ValueType<T> {
    return this.options.valueType;
  }

  isValid(): boolean {
    return this.valueType.is(this.options.value);
  }

  value(): T {
    return this.options.value;
  }

  async evaluatePromise(_scope: FormatStringScope): Promise<T> {
    return this.value();
  }
}

/**
 * Parse constants using the supplied type. Place last when composing other syntax.
 */
export class ConstantExpressionParser<T = string> extends ExpressionParser<ConstantExpression<T>> {
  readonly valueType: ValueType<T>;

  constructor(...[valueType]: string extends T ? [valueType?: ValueType<T>] : [valueType: ValueType<T>]) {
    super();
    this.valueType = valueType ?? (TextType as ValueType<T>);
  }

  tryParse(source: ExpressionSource, start = 0): ConstantExpression<T> {
    const text = stringify(source);
    const tokens = typeof source === 'string' ? [new TextToken(text, start)] : source;
    return new ConstantExpression({
      value: this.valueType.parse(text),
      valueType: this.valueType,
      tokens,
      start: tokens[0]?.start ?? start
    });
  }
}
