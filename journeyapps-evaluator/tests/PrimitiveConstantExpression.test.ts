import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConstantExpression, NumericConstantExpressionParser, PrimitiveConstantExpression } from '../src';

describe('PrimitiveConstantExpression', () => {
  it('specializes the constant base and infers the primitive value type', () => {
    const boolean = new PrimitiveConstantExpression({ expression: false });
    const number = new PrimitiveConstantExpression({ expression: 42 });
    expect(boolean).toBeInstanceOf(ConstantExpression);
    expectTypeOf(boolean.value()).toMatchTypeOf<boolean>();
    expectTypeOf(number.value()).toMatchTypeOf<number>();
    expectTypeOf<ConstructorParameters<typeof PrimitiveConstantExpression>[0]['expression']>().toEqualTypeOf<
      number | boolean
    >();
  });

  it('preserves the concrete primitive type when cloning', () => {
    const token = new PrimitiveConstantExpression({ expression: 1000, text: '1e3', start: 2 });
    const cloned = token.clone();
    expect(cloned).toBeInstanceOf(PrimitiveConstantExpression);
    expect(cloned).not.toBe(token);
    expect(cloned.options).toEqual(token.options);
  });

  it('parses numeric attribute syntax independently of boolean and code syntax', () => {
    const parser = new NumericConstantExpressionParser();
    for (const source of ['01', '-1.5', '1e3', '0x10', ' 42 ', '']) {
      const expression = parser.tryParse(source, 7);
      expect(expression.value()).toBe(Number(source));
      expect(expression.stringify()).toBe(source);
      expect(expression.start).toBe(7);
      expect(parser.tryParse(expression.tokens).options).toEqual(expression.options);
    }
    for (const source of ['true', 'false', 'null', 'hello', 'save()', '$:42']) {
      expect(parser.tryParse(source)).toBeNull();
    }
  });
});
