import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConstantExpression, NullExpression } from '../src';

describe('NullExpression', () => {
  it('fixes the constant value to null without a null-literal flag', () => {
    const token = new NullExpression({ start: 4 });
    expect(token).toBeInstanceOf(ConstantExpression);
    expectTypeOf(token.value()).toEqualTypeOf<null>();
    expect(token.value()).toBeNull();
    expect(token.text()).toBe('null');
    expect(token.stringify()).toBe('null');
    expect('isNullLiteral' in token).toBe(false);
    expect(token.clone()).toBeInstanceOf(NullExpression);
  });
});
