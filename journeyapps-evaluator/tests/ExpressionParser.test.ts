import { describe, expect, it } from 'vitest';
import {
  parseExpression,
  CombinedParser,
  FunctionExpressionParser,
  ShorthandExpressionParser,
  EvaluatedExpressionParser,
  FormatStringExpressionParser,
  PlaceholderToken,
  ConstantExpression,
  FunctionExpression,
  ShorthandExpression,
  TextExpression,
  PrimitiveConstantExpression,
  NullExpression,
  EvaluatedExpression,
  FormatShorthandExpression,
  JSToken,
  PrefixToken
} from '../src';

describe('Expression parser composition', () => {
  it.each([
    ['false', false, PrimitiveConstantExpression],
    ['1e3', 1000, PrimitiveConstantExpression],
    ["'it\\'s fine'", "it's fine", TextExpression],
    ['"Hello"', 'Hello', TextExpression],
    ['null', null, NullExpression]
  ])('preserves the syntax and typed value of %s', (source, value, Type) => {
    const expression = parseExpression(String(source)) as ConstantExpression;
    expect(expression).toBeInstanceOf(Type);
    expect(expression.value()).toBe(value);
    expect(expression.stringify()).toBe(source);
  });

  it.each(['user.name', 'user[field]', "user['name'].length", 'shared.func().something', 'user?.name'])(
    'keeps reference structure in Babel: %s',
    (source) => {
      const expression = parseExpression(source) as ShorthandExpression;
      expect(expression).toBeInstanceOf(ShorthandExpression);
      expect(expression.tokens).toHaveLength(1);
      expect(expression.js.ast.type).toMatch(/MemberExpression/);
      expect(expression.stringify()).toBe(source);
    }
  );

  it.each(['$:foo()', '$:myVar', '$:journey.version', "$:user['name'].length"])(
    'recognizes prefixed expressions without changing source: %s',
    (source) => {
      const expression = parseExpression(source);
      expect(expression).toBeInstanceOf(EvaluatedExpression);
      expect(expression.constructor).toBe(source === '$:foo()' ? FunctionExpression : EvaluatedExpression);
      expect(expression.stringify()).toBe(source);
    }
  );

  it('retains nested calls, arrays and objects in one Babel tree', () => {
    const source = ' $:save("Hello", [true, user.name], {value: find(null)}) /* end */ ';
    const expression = FunctionExpression.parse(source);
    expect(expression.functionName()).toBe('save');
    expect(expression.arguments.map((argument) => argument.type)).toEqual([
      'StringLiteral',
      'ArrayExpression',
      'ObjectExpression'
    ]);
    const object = expression.arguments[2];
    expect(object.type).toBe('ObjectExpression');
    if (object.type === 'ObjectExpression' && object.properties[0].type === 'ObjectProperty') {
      expect(object.properties[0].value.type).toBe('CallExpression');
    }
    expect(expression.tokens.filter((token) => token instanceof JSToken)).toHaveLength(1);
    expect(expression.stringify()).toBe(source);
  });

  it('preserves operators, parentheses and conditional branch types', () => {
    const source = '$: (ready || enabled) ? "Yes" : null';
    const expression = parseExpression(source) as EvaluatedExpression;
    expect(expression.constructor).toBe(EvaluatedExpression);
    const node = (expression.codeToken as JSToken).ast;
    expect(node.type).toBe('ConditionalExpression');
    if (node.type === 'ConditionalExpression') {
      expect([node.test.type, node.consequent.type, node.alternate.type]).toEqual([
        'LogicalExpression',
        'StringLiteral',
        'NullLiteral'
      ]);
    }
    expect(expression.stringify()).toBe(source);
    expect(expression.text()).toBe('(ready || enabled) ? "Yes" : null');
  });

  it.each(['value:05', 'value:.2f', 'product.price:.2f'])('recognizes format specifiers: %s', (source) => {
    const expression = parseExpression(source);
    expect(expression).toBeInstanceOf(FormatShorthandExpression);
    expect(expression.stringify()).toBe(source);
    expect(expression.format).toBe(source.includes('05') ? '05' : '.2f');
  });

  it('supports existing tree tokens without changing their identity', () => {
    const tokens = [new PrefixToken(20), new JSToken('save(true)', 22)];
    const expression = new FunctionExpressionParser().tryParse(tokens);
    expect(expression.tokens).toEqual(tokens);
    expect(expression.js).toBe(tokens[1]);
    expect(parseExpression(tokens)).toBeInstanceOf(FunctionExpression);
    expect(() => FunctionExpression.parse('true')).toThrow(SyntaxError);
    expect(() => FunctionExpression.parse('')).toThrow(SyntaxError);
  });

  it('uses caller-defined order and stops after the first matching parser', () => {
    const visited: string[] = [];
    const parser = new CombinedParser([
      {
        tryParse: () => {
          visited.push('first');
          return null;
        }
      },
      {
        tryParse: (source) => {
          visited.push('second');
          return TextExpression.parse(source);
        }
      },
      {
        tryParse: () => {
          throw new Error('Must not be visited');
        }
      }
    ]);
    expect(parser.tryParse('hello').stringify()).toBe('hello');
    expect(visited).toEqual(['first', 'second']);
    expect(new CombinedParser([]).tryParse('hello')).toBeNull();
  });

  it('distinguishes an unrecognized syntax from malformed recognized input', () => {
    const parser = new CombinedParser([new FunctionExpressionParser(), new ShorthandExpressionParser()]);
    expect(parser.tryParse('42')).toBeNull();
    expect(new FunctionExpressionParser().tryParse('worker')).toBeNull();
    expect(parser.tryParse('worker')).toBeInstanceOf(ShorthandExpression);
    expect(() => parser.tryParse('$:broken(')).toThrow(SyntaxError);
    expect(new CombinedParser([new EvaluatedExpressionParser()]).tryParse('')).toBeNull();
    expect(parseExpression('broken(')).toBeNull();
    expect(() => parseExpression('$:broken(')).toThrow(SyntaxError);
  });
  it('preserves offsets through composed and format-string parsers', () => {
    const functionParser = new CombinedParser([new FunctionExpressionParser()]);
    const functionExpression = functionParser.tryParse('$:save(true)', 20) as FunctionExpression;
    expect(functionExpression.tokens.map((token) => token.start)).toEqual([20, 22]);
    const format = new FormatStringExpressionParser().tryParse('Hello {$:save(true)}', 100);
    expect(format.tokens.map((token) => token.start)).toEqual([100, 106]);
    const placeholder = format.tokens[1] as PlaceholderToken;
    expect(placeholder.expression).toBeInstanceOf(FunctionExpression);
    expect(placeholder.children.map((token) => token.start)).toEqual([107, 109]);
    expect(format.stringify()).toBe('Hello {$:save(true)}');
  });
});
