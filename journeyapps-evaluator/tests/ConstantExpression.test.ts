import { describe, expect, it } from 'vitest';
import { ConstantExpression } from '../src';

describe('ConstantExpression', () => {
  it('retains typed values separately from source syntax', async () => {
    const token = ConstantExpression.parse('1e3');
    expect(token.value()).toBe(1000);
    expect(token.text()).toBe('1e3');
    expect(await token.evaluatePromise(null)).toBe(1000);
  });

  it('renders non-text constants without quotes when embedded', () => {
    expect(ConstantExpression.deserialize(false).stringify()).toBe('false');
  });
});
