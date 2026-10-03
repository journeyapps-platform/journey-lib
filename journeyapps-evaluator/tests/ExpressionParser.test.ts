import { TextType } from '../src';
import { describe, expect, it } from 'vitest';
import {
  ExpressionParser,
  ExpressionSource,
  parseExpression,
  CombinedParser,
  FunctionExpressionParser,
  ShorthandExpressionParser,
  EvaluatedExpressionParser,
  ConstantExpressionParser,
  FormatStringExpressionParser,
  PlaceholderToken,
  ConstantExpression,
  FunctionExpression,
  ShorthandExpression,
  EvaluatedExpression,
  FormatShorthandExpression,
  JSToken,
  PrefixToken
} from '../src';

describe('Expression parser composition', () => {
  it('combines evaluated syntax with literal text without inferring the target value type', async () => {
    const parser = new CombinedParser<EvaluatedExpression | ConstantExpression>([
      new FunctionExpressionParser(),
      new EvaluatedExpressionParser(),
      new ConstantExpressionParser()
    ]);
    const literal = parser.tryParse('1e3');
    expect(await literal.evaluatePromise(null)).toBe('1e3');
    expect(parser.tryParse('$:count()')).toBeInstanceOf(FunctionExpression);
    expect(parser.tryParse('$:count + 1')).toBeInstanceOf(EvaluatedExpression);
    expect(() => parser.tryParse('$:broken(')).toThrow(SyntaxError);
  });

  it.each(['false', '1e3', "'it\\'s fine'", '"Hello"', 'null'])(
    'preserves constant %s without decoding it',
    (source) => {
      const expression = parseExpression(source) as ConstantExpression;
      expect(expression).toBeInstanceOf(ConstantExpression);
      expect(expression.value()).toBe(source);
      expect(expression.raw()).toBe(source);
    }
  );

  it.each(['user.name', 'user[field]', "user['name'].length", 'shared.func().something', 'user?.name'])(
    'keeps reference structure in Babel: %s',
    (source) => {
      const expression = parseExpression(source) as ShorthandExpression;
      expect(expression).toBeInstanceOf(ShorthandExpression);
      expect(expression.tokens).toHaveLength(1);
      expect((expression.codeToken as JSToken).ast.type).toMatch(/MemberExpression/);
      expect(expression.raw()).toBe(source);
    }
  );

  it.each(['$:foo()', '$:myVar', '$:journey.version', "$:user['name'].length"])(
    'recognizes prefixed expressions without changing source: %s',
    (source) => {
      const expression = parseExpression(source);
      expect(expression).toBeInstanceOf(EvaluatedExpression);
      expect(expression.constructor).toBe(source === '$:foo()' ? FunctionExpression : EvaluatedExpression);
      expect(expression.raw()).toBe(source);
    }
  );

  it('retains nested calls, arrays and objects in one Babel tree', () => {
    const source = ' $:save("Hello", [true, user.name], {value: find(null)}) /* end */ ';
    const expression = FunctionExpression.parse(source);
    expect(expression.functionName()).toBe('save');
    expect((expression.codeToken as JSToken).arguments.map((argument) => argument.type)).toEqual([
      'StringLiteral',
      'ArrayExpression',
      'ObjectExpression'
    ]);
    const object = (expression.codeToken as JSToken).arguments[2];
    expect(object.type).toBe('ObjectExpression');
    if (object.type === 'ObjectExpression' && object.properties[0].type === 'ObjectProperty') {
      expect(object.properties[0].value.type).toBe('CallExpression');
    }
    expect(expression.tokens.filter((token) => token instanceof JSToken)).toHaveLength(1);
    expect(expression.raw()).toBe(source);
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
    expect(expression.raw()).toBe(source);
    expect(expression.code()).toBe('(ready || enabled) ? "Yes" : null');
  });

  it.each(['value:05', 'value:.2f', 'product.price:.2f'])('recognizes format specifiers: %s', (source) => {
    const expression = parseExpression(source);
    expect(expression).toBeInstanceOf(FormatShorthandExpression);
    expect(expression.raw()).toBe(source);
    expect(expression.format).toBe(source.includes('05') ? '05' : '.2f');
  });

  it('supports existing tree tokens without changing their identity', () => {
    const tokens = [new PrefixToken(20), new JSToken('save(true)', 22)];
    const expression = new FunctionExpressionParser().tryParse(tokens);
    expect(expression.tokens).toEqual(tokens);
    expect(expression.codeToken).toBe(tokens[1]);
    expect(parseExpression(tokens)).toBeInstanceOf(FunctionExpression);
    expect(() => FunctionExpression.parse('true')).toThrow(SyntaxError);
    expect(() => FunctionExpression.parse('')).toThrow(SyntaxError);
  });

  it('uses caller-defined order and stops after the first matching parser', () => {
    const visited: string[] = [];
    const parser = new CombinedParser([
      new (class extends ExpressionParser<ConstantExpression> {
        tryParse() {
          visited.push('first');
          return null;
        }
      })(),
      new (class extends ExpressionParser<ConstantExpression> {
        tryParse(source: ExpressionSource) {
          visited.push('second');
          return ConstantExpression.parse(source, TextType);
        }
      })(),
      new (class extends ExpressionParser<ConstantExpression> {
        tryParse(): never {
          throw new Error('Must not be visited');
        }
      })()
    ]);
    expect(parser.tryParse('hello').raw()).toBe('hello');
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
    expect(parseExpression('broken(')).toBeInstanceOf(ConstantExpression);
    expect(() => parseExpression('$:broken(')).toThrow(SyntaxError);
  });
  it('requires valid matches while preserving parser failures and source positions', () => {
    const parser = new CombinedParser([new FunctionExpressionParser(), new ShorthandExpressionParser()]);
    expect(() => parser.parse('42')).toThrow('Input does not match CombinedParser.');
    expect(parser.parse('worker', 20).start).toBe(20);
    const failure = new SyntaxError('Invalid source');
    const failing = new (class extends ExpressionParser {
      tryParse(): never {
        throw failure;
      }
    })();
    expect(() => failing.parse('source')).toThrow(failure);
    const invalid = new (class extends ExpressionParser<EvaluatedExpression> {
      tryParse() {
        return new EvaluatedExpression({ tokens: [new PrefixToken()] });
      }
    })();
    expect(() => invalid.parse('$:')).toThrow(SyntaxError);
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
    expect(format.raw()).toBe('Hello {$:save(true)}');
  });
});
