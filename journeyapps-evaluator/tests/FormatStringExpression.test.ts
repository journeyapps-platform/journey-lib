import { describe, expect, it } from 'vitest';
import {
  AbstractExpression,
  ConstantExpression,
  FormatShorthandExpression,
  FormatStringExpression,
  FunctionExpression,
  EvaluatedExpression,
  PrimitiveConstantExpression,
  ShorthandExpression,
  TextExpression,
  AbstractToken,
  TextToken,
  PlaceholderToken,
  PrefixToken,
  JSToken
} from '../src';

describe('FormatStringExpression', () => {
  it('owns one complete token sequence and a separate typed parameter array', () => {
    const source = 'Hello {user.name}, {$:getGreeting(true)}';
    const expression = FormatStringExpression.parse(source);
    expect(expression).toBeInstanceOf(AbstractExpression);
    expect(expression.tokens.every((token) => token instanceof AbstractToken)).toBe(true);
    expect(expression.parameters.map((parameter) => parameter.constructor)).toEqual([
      ShorthandExpression,
      FunctionExpression
    ]);
    const call = expression.parameters[1] as FunctionExpression;
    expect(call.arguments[0].type).toBe('BooleanLiteral');
    expect(expression.tokens.map((token) => token.constructor)).toEqual([
      TextToken,
      PlaceholderToken,
      TextToken,
      PlaceholderToken
    ]);
    const placeholder = expression.tokens[3] as PlaceholderToken;
    expect(placeholder.expression).toBe(call);
    expect(placeholder.children.map((token) => token.constructor)).toEqual([PrefixToken, JSToken]);
    expect(placeholder.start).toBe(source.indexOf('{$:'));
    expect(call.js.start).toBe(source.indexOf('getGreeting'));
    expect(call.js.source.slice(call.arguments[0].start, call.arguments[0].end)).toBe('true');
    expect(expression.stringify()).toBe(source);
  });

  it.each(['Plain text', '{{person.name}}', '{person.name', '{$:foo({3, "xyz")}'])(
    'represents text and unmatched placeholders entirely as tokens: %s',
    (source) => {
      const expression = FormatStringExpression.parse(source);
      expect(expression.parameters).toEqual([]);
      expect(expression.tokens).toEqual([new TextToken(source)]);
      expect(expression.stringify()).toBe(source);
    }
  );

  it('keeps constant placeholders as expressions instead of merging them into surrounding text', () => {
    const expression = FormatStringExpression.parse('Plain {123} {false} {null}');
    expect(expression.parameters).toHaveLength(3);
    expect(expression.parameters.map((parameter: ConstantExpression) => parameter.value())).toEqual([123, false, null]);
    expect(expression.evaluate(null)).toBe('Plain 123 false ');
    expect(expression.stringify()).toBe('Plain {123} {false} {null}');
  });

  it('retains format syntax and source positions', () => {
    const expression = FormatStringExpression.parse('R{price:.2f}!');
    expect(expression.parameters[0]).toBeInstanceOf(FormatShorthandExpression);
    expect(expression.parameters[0].format).toBe('.2f');
    expect(expression.parameters[0].start).toBe(1);
    expect(expression.tokens.at(-1)).toEqual(new TextToken('!', 12));
    expect(expression.stringify()).toBe('R{price:.2f}!');
  });

  it.each([
    '{$:foo({myObject: 2})}',
    '{$:foo("{")}',
    '{$:foo("it\\"s } fine")}',
    '{$:/[}]/.test(value)}',
    '{$:foo(/* } */ 2)}',
    '{$:foo(`outer ${`inner ${value}`}`)}',
    '{$:value / 2 + /[}]/.test(name)}',
    '{$:save( // }\n true )}',
    '{$:items.map(({name}) => ({label: `${name}`}))}',
    '{$:(() => { if (ready) {} /[}]/.test(name); return true; })()}',
    '{$:(() => { if (ready) {} else /[}]/.test(name); return true; })()}',
    '{prices["currency:USD"] : .2f }'
  ])('parses nested syntax without treating its braces as format delimiters: %s', (placeholder) => {
    const source = `Before ${placeholder} after`;
    const expression = FormatStringExpression.parse(source);
    expect(expression.parameters).toHaveLength(1);
    expect(expression.parameters[0]).toBeInstanceOf(
      placeholder.startsWith('{$:') ? EvaluatedExpression : FormatShorthandExpression
    );
    expect(expression.parameters[0].start).toBe(7);
    expect(expression.tokens.filter((token) => token instanceof PlaceholderToken)).toHaveLength(1);
    expect(expression.stringify()).toBe(source);
  });

  it('encodes constructed text and expressions for their destination syntax', () => {
    const expression = FormatStringExpression.parse([
      TextToken.fromValue('Hello {literal} '),
      new PlaceholderToken(new ShorthandExpression({ expression: 'person.name' })),
      new TextToken(' '),
      new PlaceholderToken(FunctionExpression.parse('$:greet("world")')),
      new PlaceholderToken(new TextExpression({ expression: "it's fine" }))
    ]);
    expect(expression.stringify()).toBe("Hello {{literal}} {person.name} {$:greet(\"world\")}{'it\\'s fine'}");
    expect(expression.parameters).toHaveLength(3);
  });

  it('replaces parameters without changing source text outside their placeholders', () => {
    const expression = FormatStringExpression.parse('Hello {{literal}} {user.name}, {$:greet(true)}!');
    const updated = expression.withParameters([
      new TextExpression({ expression: 'Dylan' }),
      (expression.parameters[1] as FunctionExpression).withArguments([
        new PrimitiveConstantExpression({ expression: false })
      ])
    ]);
    expect(updated.stringify()).toBe("Hello {{literal}} {'Dylan'}, {$:greet(false)}!");
    expect(expression.stringify()).toBe('Hello {{literal}} {user.name}, {$:greet(true)}!');
    expect(() => expression.withParameters([])).toThrow();
  });

  it('clones parameter expressions and their Babel trees while sharing literal text', () => {
    const expression = FormatStringExpression.parse('Hi {$:greet(true)}');
    const clone = expression.clone();
    expect(clone.parameters[0]).not.toBe(expression.parameters[0]);
    expect(clone.tokens[0]).toBe(expression.tokens[0]);
    expect((clone.parameters[0] as FunctionExpression).js.ast).not.toBe(
      (expression.parameters[0] as FunctionExpression).js.ast
    );
    expect(clone.stringify()).toBe(expression.stringify());
  });
  it('keeps prefixed calls and evaluated values distinct through rendering', async () => {
    const expression = FormatStringExpression.parse('Value {$:true}, call {$:getGreeting()}');
    expect(expression.parameters.map((parameter) => parameter.constructor)).toEqual([
      EvaluatedExpression,
      FunctionExpression
    ]);
    expect(expression.evaluate(null)).toBe(expression.stringify());
    const evaluated: string[] = [];
    const scope = {
      evaluateFunctionExpression: async (source: string) => {
        evaluated.push(source);
        return source === 'true' ? true : 'hello';
      }
    };
    expect(await expression.evaluatePromise(scope as any)).toBe('Value true, call hello');
    expect(evaluated).toEqual(['true', 'getGreeting()']);
  });

  it.each(['save()', '[1,2]', 'ready ? greet() : null', '`template`'])(
    'requires the evaluation prefix for executable placeholder code: %s',
    (source) => {
      expect(() => FormatStringExpression.parse(`Before {${source}} after`)).toThrow(SyntaxError);
      expect(FormatStringExpression.parse(`Before {$:${source}} after`).parameters[0]).toBeInstanceOf(
        EvaluatedExpression
      );
    }
  );
});
