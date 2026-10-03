import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ConstantExpression,
  ConstantExpressionParser,
  TextToken,
  NumberType,
  BooleanType,
  TextType,
  ValueType,
  FormatStringExpression
} from '../src';

describe('ConstantExpression', () => {
  it.each([
    'hello',
    '42',
    '01',
    '-1.5',
    '1e3',
    '0x10',
    'true',
    'false',
    'null',
    '"hello"',
    "'it\\'s fine'",
    "'unfinished",
    ' 42 ',
    'Hello {user.name}',
    '{{name}}',
    '$:save()',
    'save()',
    '1 + 2',
    "It's\na \\ path\r",
    ''
  ])('preserves %j as text through parsing, evaluation and cloning', async (source) => {
    const expression = ConstantExpression.parse(source, TextType, 7);
    expectTypeOf(expression.value()).toEqualTypeOf<string>();
    expect(expression.value()).toBe(source);
    expect(expression.raw()).toBe(source);
    expect(expression.start).toBe(7);
    expect(await expression.evaluatePromise(null)).toBe(source);
    expect(expression.clone()).not.toBe(expression);
    expect(expression.clone().value()).toBe(source);
    expect(expression.clone().options).toEqual(expression.options);
    expect(new ConstantExpressionParser().tryParse(expression.tokens).options).toEqual(expression.options);
  });

  it('parses an explicit type without changing source, tokens or clone behavior', async () => {
    const expression = ConstantExpression.parse(' 045 ', NumberType, 7);
    expectTypeOf(expression.value()).toEqualTypeOf<number>();
    expect(expression.value()).toBe(45);
    expect(expression.raw()).toBe(' 045 ');
    expect(expression.start).toBe(7);
    expect(expression.isValid()).toBe(true);
    expect(await expression.evaluatePromise(null)).toBe(45);
    const clone = expression.clone();
    expect(clone.valueType).toBe(NumberType);
    expect(clone.value()).toBe(45);
    expect(new ConstantExpressionParser(NumberType).tryParse(expression.tokens).value()).toBe(45);
    const formatted = FormatStringExpression.parse('{value}').withParameters([expression]);
    expect(formatted.raw()).toBe('{ 045 }');
    expect(await formatted.evaluatePromise(null)).toBe('45');
  });

  it('uses the same explicit types for constants and resolved values', () => {
    expect(ConstantExpression.parse('1e3', NumberType).value()).toBe(1000);
    expect(NumberType.parse(1000)).toBe(1000);
    expect(NumberType.is('1000')).toBe(false);
    expect(ConstantExpression.parse('false', BooleanType).value()).toBe(false);
    expect(ConstantExpression.parse('0', BooleanType).value()).toBe(false);
    expect(BooleanType.parse(true)).toBe(true);
    expect(BooleanType.parse(1)).toBe(true);
    expect(TextType.parse(45)).toBe('45');
    expectTypeOf(ConstantExpression.parse('true', BooleanType).value()).toEqualTypeOf<boolean>();
  });

  it.each(['', ' ', '45px', 'true', 'null', 'NaN', 'Infinity', '1e999'])(
    'rejects invalid numeric source %j',
    (source) => {
      expect(() => ConstantExpression.parse(source, NumberType)).toThrow(SyntaxError);
    }
  );

  it.each([null, undefined, true, {}, [], NaN, Infinity])('rejects invalid resolved numeric value %j', (value) => {
    expect(() => NumberType.parse(value)).toThrow(SyntaxError);
  });

  it.each(['', 'null', 'yes', 'true false', 'Infinity'])('rejects invalid boolean source %j', (source) => {
    expect(() => ConstantExpression.parse(source, BooleanType)).toThrow(SyntaxError);
  });

  it('supports consumer types without another expression subclass', () => {
    const direction: ValueType<'asc' | 'desc'> = {
      name: 'direction',
      is: (value): value is 'asc' | 'desc' => value === 'asc' || value === 'desc',
      parse(value) {
        if (this.is(value)) return value;
        throw new SyntaxError('Expected asc or desc.');
      }
    };
    const expression = ConstantExpression.parse('desc', direction);
    expectTypeOf(expression.value()).toEqualTypeOf<'asc' | 'desc'>();
    expect(expression.value()).toBe('desc');
    expect(() => ConstantExpression.parse('sideways', direction)).toThrow('Expected asc or desc.');
  });

  it('preserves supplied token identity and source positions', () => {
    const tokens = [new TextToken('Hello ', 10), new TextToken('{{name}}', 16)];
    const expression = ConstantExpression.parse(tokens, TextType);
    expect(expression.value()).toBe('Hello {{name}}');
    expect(expression.start).toBe(10);
    expect(expression.tokens[0]).toBe(tokens[0]);
    expect(expression.tokens[1]).toBe(tokens[1]);
    expect(ConstantExpression.parse([], TextType, 7).start).toBe(7);
  });
});
