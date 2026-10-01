import { JSToken } from '../src';
import { describe, expect, it } from 'vitest';
import { ShorthandExpression } from '../src';

describe('ShorthandExpression', () => {
  it('retains reference syntax and its Babel tree', () => {
    const expression = ShorthandExpression.parse('worker.name');
    expect(expression.text()).toBe('worker.name');
    expect((expression.code as JSToken).ast.type).toBe('MemberExpression');
  });

  it('owns the computed property tree when cloned', () => {
    const expression = ShorthandExpression.parse('worker[field]');
    const clone = expression.clone();
    expect((clone.code as JSToken).ast).not.toBe((expression.code as JSToken).ast);
    const node = (clone.code as JSToken).ast;
    expect(node.type).toBe('MemberExpression');
    if (node.type === 'MemberExpression') expect(node.computed).toBe(true);
    expect(clone.stringify()).toBe(expression.stringify());
  });
});
