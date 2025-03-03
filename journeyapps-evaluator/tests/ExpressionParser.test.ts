import { describe, it, expect, beforeEach } from 'vitest';
import {
  ArrayTokenExpression,
  ConstantTokenExpression,
  FormatShorthandTokenExpression,
  FunctionExpressionContext,
  FunctionTokenExpression,
  PrimitiveConstantTokenExpression,
  ShorthandTokenExpression,
  TokenExpressionParser
} from '../src';
import { FormatStringContext } from '../src/context/FormatStringContext';

declare module 'vitest' {
  export interface TestContext {
    parser: TokenExpressionParser;
  }
}

describe('Expression Parsing ', () => {
  beforeEach((context) => {
    context.parser = new TokenExpressionParser();
  });

  it('should parse PrimitiveConstantTokenExpression', ({ parser }) => {
    let result = parser.parse({ source: '3' });
    expect(result).toBeInstanceOf(PrimitiveConstantTokenExpression);
    expect(result.expression).toEqual(3);

    result = parser.parse({ source: 'true' });
    expect(result).toBeInstanceOf(PrimitiveConstantTokenExpression);
    expect(result.expression).toEqual(true);
  });

  it('should parse ConstantTokenExpression', ({ parser }) => {
    let result = parser.parse({ source: '"foo"' });
    expect(result).toBeInstanceOf(ConstantTokenExpression);
    expect(result.expression).toEqual('foo');

    result = parser.parse({ source: '{{cool}}' });
    expect(result).toBeInstanceOf(ConstantTokenExpression);
    expect(result.expression).toEqual('{cool}');
  });

  it('should parse ShorthandTokenExpression', ({ parser }) => {
    let result = parser.parse<ShorthandTokenExpression>({ source: 'foo' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('foo');

    result = parser.parse<ShorthandTokenExpression>({ source: 'user.name' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('user.name');
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([new ShorthandTokenExpression({ expression: 'name' })]);

    result = parser.parse({ source: '{user.name}' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('user.name');
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([new ShorthandTokenExpression({ expression: 'name' })]);

    result = parser.parse({ source: 'user.name.first' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('user.name.first');
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ShorthandTokenExpression({ expression: 'name' }),
      new ShorthandTokenExpression({ expression: 'first' })
    ]);

    result = parser.parse<ShorthandTokenExpression>({ source: 'user[field]' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('user[field]');
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ShorthandTokenExpression({ expression: 'field', isComputed: true })
    ]);

    result = parser.parse<ShorthandTokenExpression>({ source: 'user.roles[field]' });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual('user.roles[field]');
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ShorthandTokenExpression({ expression: 'roles' }),
      new ShorthandTokenExpression({ expression: 'field', isComputed: true })
    ]);

    result = parser.parse<ShorthandTokenExpression>({ source: "user['name'].length" });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual("user['name'].length");
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ConstantTokenExpression({ expression: 'name', isComputed: true }),
      new ShorthandTokenExpression({ expression: 'length' })
    ]);

    result = parser.parse<ShorthandTokenExpression>({ source: "user['roles']['admin']" });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual("user['roles']['admin']");
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ConstantTokenExpression({ expression: 'roles', isComputed: true }),
      new ConstantTokenExpression({ expression: 'admin', isComputed: true })
    ]);

    result = parser.parse<ShorthandTokenExpression>({ source: "user.files['image'].filename.length" });
    expect(result).toBeInstanceOf(ShorthandTokenExpression);
    expect(result.expression).toEqual("user.files['image'].filename.length");
  });

  it('should parse FunctionTokenExpression', ({ parser }) => {
    let result: any = parser.parse({ source: 'foo()' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('foo()');

    result = parser.parse({ source: '$:foo()' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('foo()');

    result = parser.parse({ source: '{$:foo()}' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('foo()');

    result = parser.parse({ source: '$:myVar.foo()' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('myVar.foo()');

    result = parser.parse({ source: '$:myVar' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('myVar');

    result = parser.parse({ source: '{$:myVar}' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('myVar');

    result = parser.parse<FunctionTokenExpression>({ source: '$:journey.version' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('journey.version');
    expect(result.isFunction()).toEqual(true);
    expect(result.stringify()).toEqual('journey.version');
    expect(result.options.name).toEqual('journey');
    expect(result.options.properties).toEqual([new ShorthandTokenExpression({ expression: 'version' })]);

    result = parser.parse<FunctionTokenExpression>({ source: "$:user['name'].length" });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual("user['name'].length");
    expect(result.isFunction()).toEqual(true);
    expect(result.stringify()).toEqual("user['name'].length");
    expect(result.options.name).toEqual('user');
    expect(result.options.properties).toEqual([
      new ConstantTokenExpression({ expression: 'name', isComputed: true }),
      new ShorthandTokenExpression({ expression: 'length' })
    ]);

    result = parser.parse({ source: '$:null' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('null');

    result = parser.parse({ source: '$:true' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('true');

    result = parser.parse({ source: '$:(showIf() || false)' });
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.expression).toEqual('showIf() || false');
    expect(result.stringify()).toEqual('(function(left, right) { return left || right; })(showIf(), false)');
  });

  it('should parse FunctionTokenExpression with arguments', ({ parser }) => {
    let result = parser.parse<FunctionTokenExpression>({ source: 'foo("bar", 3, true)' });
    expect(result.functionName()).toEqual('foo');
    const args = result.arguments;
    expect(args).toEqual([
      new ConstantTokenExpression({ expression: 'bar' }),
      new PrimitiveConstantTokenExpression({ expression: 3 }),
      new PrimitiveConstantTokenExpression({ expression: true })
    ]);

    result = parser.parse<FunctionTokenExpression>({ source: '(function (input){ return input + "bar" })("foo")' });
    expect(result.functionName()).toEqual('function (input){ return input + "bar" }');
    expect(result.arguments).toEqual([new ConstantTokenExpression({ expression: 'foo' })]);

    result = parser.parse<FunctionTokenExpression>({ source: 'foo(user.name.first)' });
    expect(result.functionName()).toEqual('foo');
    expect(result.arguments).toEqual([
      new ShorthandTokenExpression({
        expression: 'user.name.first',
        name: 'user',
        properties: [
          new ShorthandTokenExpression({ expression: 'name' }),
          new ShorthandTokenExpression({ expression: 'first' })
        ]
      })
    ]);

    result = parser.parse<FunctionTokenExpression>({ source: 'foo([true, "bar", user.name])' });
    expect(result.functionName()).toEqual('foo');
    const arrayTokenExpression = result.arguments[0];
    expect(arrayTokenExpression).toEqual(
      new ArrayTokenExpression({
        expression: '[true, "bar", user.name]',
        elements: [
          new PrimitiveConstantTokenExpression({ expression: true }),
          new ConstantTokenExpression({ expression: 'bar' }),
          new ShorthandTokenExpression({
            expression: 'user.name',
            name: 'user',
            properties: [new ShorthandTokenExpression({ expression: 'name' })]
          })
        ]
      })
    );
    expect(arrayTokenExpression.stringify()).toEqual('[true, "bar", user.name]');
  });

  it('should parse in-line expression to FunctionTokenExpression', ({ parser }) => {
    let result = parser.parse<FunctionTokenExpression>({ source: '$: user ? "Yes" : "No"' });
    expect(result.expression).toEqual('user ? "Yes" : "No"');
    expect(result.arguments).toEqual([
      new ShorthandTokenExpression({ expression: 'user' }),
      new ConstantTokenExpression({ expression: 'Yes' }),
      new ConstantTokenExpression({ expression: 'No' })
    ]);
    expect(result.stringify()).toEqual(`user ? 'Yes' : 'No'`);
  });

  it('should parse format specifiers', ({ parser }) => {
    let result = parser.parse({ source: 'value:05', context: new FormatStringContext() });
    expect(result).toBeInstanceOf(FormatShorthandTokenExpression);
    expect(result.expression).toEqual('value');
    expect(result.format).toEqual('05');

    result = parser.parse({ source: '{value:.2f}', context: new FormatStringContext() });
    expect(result).toBeInstanceOf(FormatShorthandTokenExpression);
    expect(result.expression).toEqual('value');
    expect(result.format).toEqual('.2f');

    result = parser.parse({ source: '{product.price:.2f}', context: new FormatStringContext() });
    expect(result).toBeInstanceOf(FormatShorthandTokenExpression);
    expect(result.expression).toEqual('product.price');
    expect(result.format).toEqual('.2f');
  });

  it('should parse member expressions', ({ parser }) => {
    let result = parser.parse({ source: '$:foo.bar.bas' }) as FunctionTokenExpression;
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.options.name).toEqual('foo');
    expect(result.options.properties).toEqual([
      new ShorthandTokenExpression({ expression: 'bar' }),
      new ShorthandTokenExpression({ expression: 'bas' })
    ]);

    result = parser.parse({ source: '$:shared.func().something' }) as FunctionTokenExpression;
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.options.name).toEqual('shared.func()');
    expect(result.options.properties).toEqual([new ShorthandTokenExpression({ expression: 'something' })]);

    result = parser.parse({ source: '$:shared.something.func()' }) as FunctionTokenExpression;
    expect(result).toBeInstanceOf(FunctionTokenExpression);
    expect(result.options.name).toEqual('shared.something.func');
    expect(result.options.properties).toEqual(undefined);
  });
});
