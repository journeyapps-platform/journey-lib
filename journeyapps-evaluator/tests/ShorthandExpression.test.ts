import { JSToken } from '../src';
import { describe, expect, it } from 'vitest';
import { ShorthandExpression } from '../src';

describe('ShorthandExpression', () => {
  it('retains reference syntax and its Babel tree', () => {
    const expression = ShorthandExpression.parse(' /* reference */ worker.name ');
    expect(expression.path).toBe('worker.name');
    expect(expression.raw()).toBe(' /* reference */ worker.name ');
    expect((expression.codeToken as JSToken).ast.type).toBe('MemberExpression');
  });

  it('owns the computed property tree when cloned', () => {
    const expression = ShorthandExpression.parse('worker[field]');
    const clone = expression.clone();
    expect((clone.codeToken as JSToken).ast).not.toBe((expression.codeToken as JSToken).ast);
    const node = (clone.codeToken as JSToken).ast;
    expect(node.type).toBe('MemberExpression');
    if (node.type === 'MemberExpression') expect(node.computed).toBe(true);
    expect(clone.raw()).toBe(expression.raw());
  });
});
