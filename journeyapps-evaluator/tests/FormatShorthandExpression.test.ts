import { describe, expect, it } from 'vitest';
import { FormatShorthandExpression, ShorthandExpression } from '../src';

describe('FormatShorthandExpression', () => {
  it('preserves a format specifier through serialization and cloning', () => {
    const token = FormatShorthandExpression.parse('price' + ':' + '.2f');
    expect(token).toBeInstanceOf(ShorthandExpression);
    expect(token.raw()).toBe('price:.2f');
    const clone = token.clone();
    expect(clone).toBeInstanceOf(FormatShorthandExpression);
    expect(clone.raw()).toBe('price:.2f');
  });
});
