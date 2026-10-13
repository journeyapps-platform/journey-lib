import { UnknownType } from '@ja-platform/types';
import { ConstantExpression, FunctionExpression, JSToken, ShorthandExpression } from '../src';
import type { ValidationContext } from '../src';
import { describe, expect, it, vi } from 'vitest';

describe('ShorthandExpression', () => {
  it('validates against changing declarations without reparsing or evaluating', () => {
    const expression = ShorthandExpression.parse('customer["first.name"]', 12);
    const getReference = vi.fn((): UnknownType | null => null);
    const scope: ValidationContext = { getReference };
    expect(expression.resolveType(scope)).toBeNull();
    const diagnostics = expression.validate(scope);

    expect(diagnostics).toEqual([
      {
        token: expression.codeToken,
        message: `'customer["first.name"]' is not defined`
      }
    ]);
    expect(diagnostics[0].token).toBe(expression.codeToken);
    expect(diagnostics[0].token.start).toBe(12);
    expect(diagnostics[0].token.end).toBe(12 + expression.raw().length);
    expect(getReference).toHaveBeenCalledWith(['customer', 'first.name']);

    const type = new UnknownType();
    getReference.mockReturnValue(type);
    expect(expression.resolveType(scope)).toBe(type);
    expect(expression.validate(scope)).toEqual([]);
    expect(diagnostics).toHaveLength(1);
  });

  it('does not resolve or execute constants and code during validation', () => {
    const scope: ValidationContext = { getReference: vi.fn() };

    expect(ConstantExpression.parse('42').validate(scope)).toEqual([]);
    expect(FunctionExpression.parse('$:save()').validate(scope)).toEqual([]);
    expect(scope.getReference).not.toHaveBeenCalled();
  });

  it('retains reference syntax and its Babel tree', () => {
    const expression = ShorthandExpression.parse(' /* reference */ worker.name ');
    expect(expression.path).toEqual(['worker', 'name']);
    expect(expression.raw()).toBe(' /* reference */ worker.name ');
    expect((expression.codeToken as JSToken).ast.type).toBe('MemberExpression');
  });

  it('owns the computed property tree when cloned', () => {
    const expression = ShorthandExpression.parse("worker['name']");
    const clone = expression.clone();
    expect((clone.codeToken as JSToken).ast).not.toBe((expression.codeToken as JSToken).ast);
    const node = (clone.codeToken as JSToken).ast;
    expect(node.type).toBe('MemberExpression');
    if (node.type === 'MemberExpression') expect(node.computed).toBe(true);
    expect(clone.raw()).toBe(expression.raw());
  });
});
