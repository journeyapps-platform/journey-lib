import { TextType } from '../src';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  EvaluatedExpressionParser,
  ConstantExpressionParser,
  FormatShorthandExpressionParser,
  FormatStringExpressionParser,
  FunctionExpressionParser,
  ShorthandExpressionParser,
  AbstractExpression,
  EvaluatedExpression,
  ConstantExpression,
  FormatShorthandExpression,
  FormatStringExpression,
  FunctionExpression,
  ShorthandExpression,
  TextToken,
  JSToken
} from '../src';

const cases = [
  [ConstantExpression, "'it\\'s fine'"],
  [ConstantExpression, 'true'],
  [ConstantExpression, '-1e3'],
  [ConstantExpression, 'null'],
  [EvaluatedExpression, '$:[true, "text", user.name]'],
  [EvaluatedExpression, '$:[1,,3]'],
  [FunctionExpression, '$:save({value: ready ? 1 : 2}, /a,b/.test(name))'],
  [EvaluatedExpression, '$:{name: "Dylan", active: true}'],
  [EvaluatedExpression, '$:{"name": "Dylan", 1: true, worker}'],
  [ShorthandExpression, "user['name'].length"],
  [FormatShorthandExpression, 'user.price:.2f'],
  [FunctionExpression, '$:save(true, [1, 2])'],
  [EvaluatedExpression, '$:ready ? "yes" : null'],
  [EvaluatedExpression, '$:((ready ? "yes" : null))'],
  [FormatStringExpression, 'Hello {user.name}, {$:greet(true)}']
] as const;

const parsers = {
  EvaluatedExpression: new EvaluatedExpressionParser(),
  ConstantExpression: new ConstantExpressionParser(),
  FormatShorthandExpression: new FormatShorthandExpressionParser(),
  FormatStringExpression: new FormatStringExpressionParser(),
  FunctionExpression: new FunctionExpressionParser(),
  ShorthandExpression: new ShorthandExpressionParser()
};

describe('Expression parsing', () => {
  it.each(cases.map(([Type, source]) => [Type.name, Type, source] as const))(
    '%s parses its own syntax from source and existing tokens',
    (_, Type, source) => {
      for (const input of [source, Type.parse(source).tokens]) {
        const expression = Type.parse(input);
        const direct = parsers[Type.name as keyof typeof parsers].tryParse(input);
        expect(direct).toBeInstanceOf(Type);
        expect(direct.raw()).toBe(expression.raw());
        expect(direct.tokens).toEqual(expression.tokens);
        expect(expression).toBeInstanceOf(Type);
        expect(expression.isValid()).toBe(true);
        expect(expression).toBeInstanceOf(AbstractExpression);
        expect(expression.raw()).toBe(source);
        expect(expression.clone().raw()).toBe(source);
        if (Array.isArray(input)) {
          expression.tokens.forEach((token, index) => expect(token).toBe(input[index]));
        }
      }
    }
  );

  const invalid = [
    [EvaluatedExpression, '$:[1, 2'],
    [EvaluatedExpression, '$:{name:}'],
    [ShorthandExpression, 'save()'],
    [ShorthandExpression, 'user.'],
    [FormatShorthandExpression, 'price:'],
    [FunctionExpression, 'true'],
    [FormatStringExpression, 'Hello {}'],
    [FormatStringExpression, 'Hello { } {name}']
  ] as const;
  it.each(invalid.map(([Type, source]) => [Type.name, Type, source] as const))(
    '%s rejects input outside its syntax: %s',
    (_, Type, source) => {
      expect(() => Type.parse(source)).toThrow(SyntaxError);
    }
  );

  it('distinguishes plain text from a format string without a global parsing mode', () => {
    const text = ConstantExpression.parse('Hello {user.name}', TextType);
    expect(text.value()).toBe('Hello {user.name}');
    expect(text.tokens).toHaveLength(1);
    expect(text.tokens[0]).toBeInstanceOf(TextToken);
    const formatted = FormatStringExpression.parse('Hello {user.name}');
    expect(formatted.parameters[0]).toBeInstanceOf(ShorthandExpression);
  });

  it('retains object key forms inside the language-specific token', () => {
    const expression = EvaluatedExpression.parse('$:{"name": "Dylan", 1: true, worker}');
    const token = expression.codeToken;
    expect(token).toBeInstanceOf(JSToken);
    if (token instanceof JSToken && token.ast.type === 'ObjectExpression') {
      expect(token.ast.properties.map((property) => property.type)).toEqual([
        'ObjectProperty',
        'ObjectProperty',
        'ObjectProperty'
      ]);
    }
    expect(expression.tokens).toHaveLength(2);
  });

  it('exposes concrete return types at the static parsing entry points', () => {
    expectTypeOf(ConstantExpression.parse('hello', TextType)).toEqualTypeOf<ConstantExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:[]')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:{}')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(FunctionExpression.parse('$:save()')).toEqualTypeOf<FunctionExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:ready ? true : false')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(FormatStringExpression.parse('Hello')).toEqualTypeOf<FormatStringExpression>();
  });
});
