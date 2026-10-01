import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConstantExpression, RawTextExpressionParser, TextExpression } from '../src';

/**
 * Text-only behavior lives here; shared constant value behavior is tested on the base class.
 */
describe('TextExpression', () => {
  it('represents plain text independently from literal source quoting', () => {
    const text = TextExpression.parse('"Hello"');
    expect(text).toBeInstanceOf(ConstantExpression);
    expectTypeOf(text.value()).toEqualTypeOf<string>();
    expect(text.text()).toBe('Hello');
    expect(text.stringify()).toBe('"Hello"');
  });

  it('escapes characters that would change the surrounding expression', () => {
    const text = TextExpression.deserialize("It's\na \\ path\r");
    expect(text.stringify()).toBe("'It\\'s\\na \\\\ path\\r'");
  });

  it('preserves unmatched source as raw text for parser combinations', () => {
    const parser = new RawTextExpressionParser();
    for (const source of ['hello', '"hello"', "'unfinished", 'true', '$:save()', '', '  text  ']) {
      const expression = parser.tryParse(source, 7);
      expect(expression.value()).toBe(source);
      expect(expression.stringify()).toBe(source);
      expect(expression.start).toBe(7);
      expect(parser.tryParse(expression.tokens).options).toEqual(expression.options);
    }
  });

  it('concatenates text into a fresh constant while keeping the first source position', () => {
    const text = TextExpression.deserialize('Count ', 3);
    const combined = text.concat(ConstantExpression.deserialize(2));
    expect(combined).toBeInstanceOf(TextExpression);
    expect(combined.value()).toBe('Count 2');
    expect(combined.start).toBe(3);
    expect(text.value()).toBe('Count ');
    expect(text.clone()).toBeInstanceOf(TextExpression);
  });
});
