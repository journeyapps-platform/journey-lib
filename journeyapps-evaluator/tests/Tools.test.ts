import { describe, expect, it } from 'vitest';
import {
  actionableExpression,
  functionExpression,
  EvaluatedExpression,
  FunctionExpression,
  ConstantExpression
} from '../src';

describe('Expression factories', () => {
  it('keeps absent expressions absent', () => {
    expect(actionableExpression(null)).toBeNull();
    expect(functionExpression(null)).toBeNull();
  });

  it('requires the modern prefix instead of falling back to a legacy function', () => {
    expect(functionExpression('save()')).toBeNull();
    expect(functionExpression('$:save()')).toBeInstanceOf(FunctionExpression);
    expect(functionExpression('$:true').constructor).toBe(EvaluatedExpression);
    expect(actionableExpression("$:{thing:'other'}").constructor).toBe(EvaluatedExpression);
    expect(actionableExpression('save()')).toBeInstanceOf(ConstantExpression);
  });
});
