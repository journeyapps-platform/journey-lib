import { describe, expect, it } from 'vitest';
import {
  EvaluatedExpression,
  ConstantExpression,
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
class QueryToken extends CodeToken<string> {
  readonly arguments: readonly string[] = [];
  readonly code: string;
  constructor(source: string, start = 0) {
    super(source, start);
    this.code = source.trim();
  }
  isCallExpression(): boolean {
    return false;
  }
  isReferenceExpression(): boolean {
    return false;
  }
  functionName(): string {
    throw new Error('Queries do not have a function name.');
  }
  sourceOf(argument: string): string {
    return argument;
  }
  withName(_name: string): QueryToken {
    throw new Error('Queries do not support call edits.');
  }
  withArguments(_args: readonly string[]): QueryToken {
    throw new Error('Queries do not support call edits.');
  }
  rewriteReferences(): QueryToken {
    return this.clone();
  }
  clone(): QueryToken {
    return new QueryToken(this.source, this.start);
  }
}

/**
 * A command in the test language whose arguments are plain source strings.
 */
class CommandToken extends QueryToken {
  readonly arguments: readonly string[];
  constructor(private readonly name: string, args: readonly string[] = [], start = 0) {
    super(`${name} ${args.join(' ')}`.trim(), start);
    this.arguments = args;
  }
  isCallExpression(): boolean {
    return true;
  }
  functionName(): string {
    return this.name;
  }
  withName(name: string): CommandToken {
    return new CommandToken(name, this.arguments, this.start);
  }
  withArguments(args: readonly string[]): CommandToken {
    return new CommandToken(this.name, args, this.start);
  }
  clone(): CommandToken {
    return new CommandToken(this.name, [...this.arguments], this.start);
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
    expect(expression.raw()).toBe(prefixed);
    expect(expression.code()).toBe(source);
    const clone = expression.clone();
    expect(clone).toBeInstanceOf(EvaluatedExpression);
    expect(clone.codeToken).not.toBe(token);
    if (token instanceof JSToken && clone.codeToken instanceof JSToken) expect(clone.codeToken.ast).not.toBe(token.ast);
    expect(clone.raw()).toBe(prefixed);
    expect(parseExpression(prefixed)).toBeInstanceOf(EvaluatedExpression);
    expect(parseExpression(prefixed).constructor).toBe(
      kind === 'CallExpression' ? FunctionExpression : EvaluatedExpression
    );
    const constant = parseExpression(source) as ConstantExpression;
    expect(constant).toBeInstanceOf(ConstantExpression);
    expect(constant.value()).toBe(source);
  });

  it('accepts another language without inspecting a Babel node', async () => {
    const token = new QueryToken('  select name from users  ', 12);
    const expression = EvaluatedExpression.parse([new PrefixToken(10), token]);
    expect(expression.codeToken).toBe(token);
    expect(parseExpression(expression.tokens)).toBeInstanceOf(EvaluatedExpression);
    expect(expression.raw()).toBe(`$:${token.source}`);
    expect(expression.code()).toBe('select name from users');
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
    expect(updated.raw()).toBe('$:select id from users');
    expect(expression.raw()).toBe(`$:${token.source}`);
  });

  it('uses the language token for function classification and call edits', () => {
    const token = new CommandToken('select', ['name', 'users'], 2);
    const expression = FunctionExpression.parse([new PrefixToken(), token]);
    expect(parseExpression(expression.tokens)).toBeInstanceOf(FunctionExpression);
    expect(expression.isValid()).toBe(true);
    expect(expression.functionName()).toBe('select');
    expect(expression.arguments.map((argument) => expression.codeToken.sourceOf(argument))).toEqual(['name', 'users']);
    const edited = expression.withName('fetch').withArgumentSources(['id', 'accounts']);
    expect(edited.raw()).toBe('$:fetch id accounts');
    expect(edited.codeToken).toBeInstanceOf(CommandToken);
    expect(edited.clone().code).not.toBe(edited.codeToken);
    expect(expression.raw()).toBe('$:select name users');
  });

  it('exposes call operations only for prefixed calls', () => {
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
