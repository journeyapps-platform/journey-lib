import { UnknownType, textType } from '@ja-platform/types';
import { TextType } from '@ja-platform/types';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  AbstractExpression,
  ConstantExpression,
  FormatShorthandExpression,
  FormatStringExpression,
  FunctionExpression,
  EvaluatedExpression,
  ShorthandExpression,
  AbstractToken,
  TextToken,
  PlaceholderToken,
  PrefixToken,
  JSToken
} from '../src';
import type { ReferencePath, ValidationContext } from '../src';

describe('FormatStringExpression', () => {
  it('validates references using declarations alone and retains the original error position', () => {
    const source = 'Hello {user.name} {missing:.2f} 42 {$:greet()}';
    const getReference = vi.fn((path: ReferencePath) => (path[0] === 'user' ? new UnknownType() : null));
    const scope: ValidationContext = { getReference };

    const expression = FormatStringExpression.parse(source);
    const diagnostics = expression.validate(scope);
    expect(diagnostics).toEqual([
      {
        token: (expression.parameters[1] as ShorthandExpression).codeToken,
        message: "'missing' is not defined"
      }
    ]);
    expect(diagnostics[0].token).toBe((expression.parameters[1] as ShorthandExpression).codeToken);
    expect(diagnostics[0].token.start).toBe(source.indexOf('missing'));
    expect(diagnostics[0].token.end).toBe(source.indexOf('missing') + 'missing'.length);
    expect(getReference.mock.calls).toEqual([[['user', 'name']], [['missing']]]);
  });

  it('preserves literal keys and numeric indices when validating references', () => {
    const scope: ValidationContext = {
      getReference: (path) =>
        (path.length === 2 && path[0] === 'user' && path[1] === 'first.name') ||
        (path.length === 3 && path[0] === 'items' && path[1] === 0 && path[2] === 'name')
          ? new UnknownType()
          : null
    };
    const expression = FormatStringExpression.parse('{user["first.name"]} {items[0].name}');

    expect(expression.validate(scope)).toEqual([]);
    expect(FormatStringExpression.parse('{user.first.name} {items["0"].name}').validate(scope)).toHaveLength(2);
  });

  it('owns one complete token sequence and a separate typed parameter array', () => {
    const source = 'Hello {user.name}, {$:getGreeting(true)}';
    const expression = FormatStringExpression.parse(source);
    expectTypeOf(expression.parameters).toEqualTypeOf<readonly (ShorthandExpression | EvaluatedExpression)[]>();
    expect(expression).toBeInstanceOf(AbstractExpression);
    expect(expression.tokens.every((token) => token instanceof AbstractToken)).toBe(true);
    expect(expression.parameters.map((parameter) => parameter.constructor)).toEqual([
      ShorthandExpression,
      FunctionExpression
    ]);
    const call = expression.parameters[1] as FunctionExpression;
    expect(call.codeToken.sourceOf(call.arguments[0])).toBe('true');
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
    expect(call.codeToken.start).toBe(source.indexOf('getGreeting'));
    expect(call.codeToken.sourceOf(call.arguments[0])).toBe('true');
    expect(expression.raw()).toBe(source);
  });

  it.each(['Plain text', '{{person.name}}', '{person.name', '{$:foo({3, "xyz")}'])(
    'represents text and unmatched placeholders entirely as tokens: %s',
    (source) => {
      const expression = FormatStringExpression.parse(source);
      expect(expression.parameters).toEqual([]);
      expect(expression.tokens).toEqual([new TextToken(source)]);
      expect(expression.raw()).toBe(source);
    }
  );

  it('rejects constant placeholders while preserving escaped literal text', () => {
    for (const source of ['1e3', 'false', 'null', '"hello"']) {
      expect(() => FormatStringExpression.parse(`{${source}}`)).toThrow(SyntaxError);
    }
    expect(FormatStringExpression.parse('Plain {{false}}').render([])).toBe('Plain {false}');
  });

  it('retains format syntax and source positions', () => {
    const expression = FormatStringExpression.parse('R{price:.2f}!');
    expect(expression.parameters[0]).toBeInstanceOf(FormatShorthandExpression);
    expect((expression.parameters[0] as FormatShorthandExpression).format).toBe('.2f');
    expect(expression.parameters[0].start).toBe(1);
    expect(expression.tokens.at(-1)).toEqual(new TextToken('!', 12));
    expect(expression.raw()).toBe('R{price:.2f}!');
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
    expect(expression.raw()).toBe(source);
  });

  it('encodes constructed text and expressions for their destination syntax', () => {
    const expression = FormatStringExpression.parse([
      TextToken.fromValue('Hello {literal} '),
      new PlaceholderToken(ShorthandExpression.parse('person.name')),
      new TextToken(' '),
      new PlaceholderToken(FunctionExpression.parse('$:greet("world")')),
      TextToken.fromValue("it's fine")
    ]);
    expect(expression.raw()).toBe('Hello {{literal}} {person.name} {$:greet("world")}it\'s fine');
    expect(expression.parameters).toHaveLength(2);
  });

  it('replaces parameters without changing source text outside their placeholders', () => {
    const expression = FormatStringExpression.parse('Hello {{literal}} {user.name}, {$:greet(true)}!');
    const updated = expression.withParameters([
      ShorthandExpression.parse('customer.name'),
      (expression.parameters[1] as FunctionExpression).withArguments([ConstantExpression.parse('false', textType)])
    ]);
    expect(updated.raw()).toBe('Hello {{literal}} {customer.name}, {$:greet(false)}!');
    expect(updated.parameters[0]).toBeInstanceOf(ShorthandExpression);
    expect(updated.parameters[1].tokens[0].start).toBe(updated.raw().indexOf('$:'));
    expect(updated.render(['Dylan', 'hello'])).toBe('Hello {literal} Dylan, hello!');
    expect(expression.raw()).toBe('Hello {{literal}} {user.name}, {$:greet(true)}!');
    expect(() => expression.withParameters([])).toThrow();
  });

  it('clones parameter expressions and their Babel trees while sharing literal text', () => {
    const expression = FormatStringExpression.parse('Hi {$:greet(true)}');
    const clone = expression.clone();
    expect(clone.parameters[0]).not.toBe(expression.parameters[0]);
    expect(clone.tokens[0]).toBe(expression.tokens[0]);
    expect(((clone.parameters[0] as FunctionExpression).codeToken as JSToken).ast).not.toBe(
      ((expression.parameters[0] as FunctionExpression).codeToken as JSToken).ast
    );
    expect(clone.raw()).toBe(expression.raw());
  });
  it('keeps prefixed calls and evaluated values distinct through rendering', () => {
    const expression = FormatStringExpression.parse('Value {$:true}, call {$:getGreeting()}');
    expect(expression.parameters.map((parameter) => parameter.constructor)).toEqual([
      EvaluatedExpression,
      FunctionExpression
    ]);
    expect(expression.render([true, 'hello'])).toBe('Value true, call hello');
  });

  it.each(['save()', '[1,2]', 'ready ? greet() : null', '`template`'])(
    'rejects unprefixed code in placeholders: %s',
    (source) => {
      expect(() => FormatStringExpression.parse(`Before {${source}} after`)).toThrow(SyntaxError);
      expect(FormatStringExpression.parse(`Before {$:${source}} after`).parameters[0]).toBeInstanceOf(
        EvaluatedExpression
      );
    }
  );
});
