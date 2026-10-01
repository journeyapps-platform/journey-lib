import { describe, expect, expectTypeOf, it } from 'vitest';
import { AbstractExpression, AbstractExpressionOptions } from '../src';

class TestExpression extends AbstractExpression {
  constructor(options: AbstractExpressionOptions) {
    super('test', options);
  }
  isValid(): boolean {
    return true;
  }
  async evaluatePromise(): Promise<string> {
    return this.expression;
  }
  clone(): this {
    return new TestExpression(this.options) as this;
  }
}

describe('AbstractExpression', () => {
  it('exposes original source and position without constant-only accessors or classification flags', () => {
    const expression = new TestExpression({ expression: 'normalized', text: ' original ', start: 3 });
    expect(expression.text()).toBe(' original ');
    expect(expression.start).toBe(3);
    expression.start = 5;
    expect(expression.start).toBe(5);
    expectTypeOf<AbstractExpression>().not.toHaveProperty('value');
    expectTypeOf<AbstractExpression>().not.toHaveProperty('isConstant');
    expectTypeOf<AbstractExpression>().not.toHaveProperty('isFunction');
    expectTypeOf<AbstractExpression>().not.toHaveProperty('isShorthand');
  });
});
