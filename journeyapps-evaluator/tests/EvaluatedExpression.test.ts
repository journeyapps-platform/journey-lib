import { describe, expect, it } from 'vitest';
import {
  EvaluatedExpression,
  CodeToken,
  JSToken,
  parseExpression,
  FunctionExpression,
  FunctionExpressionParser,
  PrefixToken
} from '../src';

/**
 * A test language token with no JavaScript parser or AST.
 */
class QueryToken extends CodeToken {
  readonly code: string;
  constructor(source: string, start = 0) {
    super(source, start);
    this.code = source.trim();
  }
  clone(): QueryToken {
    return new QueryToken(this.source, this.start);
  }
}

describe('EvaluatedExpression', () => {
  it.each([
    ['[first,, ...second]', 'ArrayExpression'],
    ['{[field]: worker.name, ...other, method() { return true; }}', 'ObjectExpression'],
    ['ready ? "Yes" : null', 'ConditionalExpression'],
    ['value + 1', 'BinaryExpression'],
    ['save(true)', 'CallExpression']
  ])('represents %s using one JavaScript token', (source, kind) => {
    const prefixed = `$:${source}`;
    const expression = EvaluatedExpression.parse(prefixed);
    expect(expression.tokens).toHaveLength(2);
    const token = expression.codeToken;
    expect(token).toBeInstanceOf(CodeToken);
    expect(token).toBeInstanceOf(JSToken);
    if (token instanceof JSToken) expect(token.ast.type).toBe(kind);
    expect(expression.stringify()).toBe(prefixed);
    const clone = expression.clone();
    expect(clone).toBeInstanceOf(EvaluatedExpression);
    expect(clone.codeToken).not.toBe(token);
    if (token instanceof JSToken && clone.codeToken instanceof JSToken) expect(clone.codeToken.ast).not.toBe(token.ast);
    expect(clone.stringify()).toBe(prefixed);
    expect(parseExpression(prefixed)).toBeInstanceOf(EvaluatedExpression);
    expect(parseExpression(prefixed).constructor).toBe(
      kind === 'CallExpression' ? FunctionExpression : EvaluatedExpression
    );
    expect(parseExpression(source)).toBeNull();
  });

  it('accepts another language without inspecting a Babel node', async () => {
    const token = new QueryToken('  select name from users  ', 12);
    const expression = EvaluatedExpression.parse([new PrefixToken(10), token]);
    expect(expression.codeToken).toBe(token);
    expect(parseExpression(expression.tokens)).toBeInstanceOf(EvaluatedExpression);
    expect(expression.stringify()).toBe(`$:${token.source}`);
    expect(expression.text()).toBe('select name from users');
    expect(expression.clone().codeToken).toBeInstanceOf(QueryToken);
    let evaluated: string;
    expect(
      await expression.evaluatePromise({
        evaluateFunctionExpression: async (source) => {
          evaluated = source;
          return 'result';
        }
      } as any)
    ).toBe('result');
    expect(evaluated).toBe('select name from users');
    const updated = expression.withCode(new QueryToken('select id from users'));
    expect(updated.stringify()).toBe('$:select id from users');
    expect(expression.stringify()).toBe(`$:${token.source}`);
  });

  it('exposes call operations only for prefixed JavaScript calls', () => {
    for (const source of ['$:true', "$:{thing:'other'}", '$:user.name', '$:ready ? greet() : null']) {
      const expression = parseExpression(source);
      expect(expression.constructor).toBe(EvaluatedExpression);
      expect('functionName' in expression).toBe(false);
      expect('arguments' in expression).toBe(false);
      expect(new FunctionExpressionParser().tryParse(source)).toBeNull();
      expect(() => FunctionExpression.parse(source)).toThrow(SyntaxError);
    }
    for (const source of ['$:save()', '$:save?.()', '$:(save())']) {
      expect(parseExpression(source).constructor).toBe(FunctionExpression);
    }
  });
});
