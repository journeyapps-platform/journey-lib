import { describe, expect, expectTypeOf, it } from 'vitest';
import { ConstantExpression } from '../src';

describe('ConstantExpression', () => {
  it('retains typed values separately from source syntax', async () => {
    const token = new ConstantExpression({ expression: 1000, text: '1e3' });
    expectTypeOf(token.value()).toMatchTypeOf<number>();
    expect(token.value()).toBe(1000);
    expect(token.text()).toBe('1e3');
    expect(await token.evaluatePromise(null)).toBe(1000);
  });

  it('renders non-text constants without quotes when embedded', () => {
    expect(new ConstantExpression({ expression: false }).stringify()).toBe('false');
  });
});
