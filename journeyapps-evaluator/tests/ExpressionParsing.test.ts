import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  EvaluatedExpressionParser,
  ConstantExpressionParser,
  FormatShorthandExpressionParser,
  FormatStringExpressionParser,
  FunctionExpressionParser,
  PrimitiveConstantExpressionParser,
  ShorthandExpressionParser,
  TextExpressionParser,
  AbstractExpression,
  EvaluatedExpression,
  ConstantExpression,
  FormatShorthandExpression,
  FormatStringExpression,
  FunctionExpression,
  PrimitiveConstantExpression,
  ShorthandExpression,
  TextExpression,
  TextToken,
  JSToken
} from '../src';

const cases = [
  [TextExpression, "'it\\'s fine'"],
  [ConstantExpression, 'true'],
  [PrimitiveConstantExpression, '-1e3'],
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
  PrimitiveConstantExpression: new PrimitiveConstantExpressionParser(),
  ShorthandExpression: new ShorthandExpressionParser(),
  TextExpression: new TextExpressionParser()
};

describe('Expression parsing', () => {
  it.each(cases.map(([Type, source]) => [Type.name, Type, source] as const))(
    '%s parses its own syntax from source and existing tokens',
    (_, Type, source) => {
      for (const input of [source, Type.parse(source).tokens]) {
        const expression = Type.parse(input);
        const direct = parsers[Type.name as keyof typeof parsers].tryParse(input);
        expect(direct).toBeInstanceOf(Type);
        expect(direct.stringify()).toBe(expression.stringify());
        expect(direct.tokens).toEqual(expression.tokens);
        expect(expression).toBeInstanceOf(Type);
        expect(expression.isValid()).toBe(true);
        expect(expression).toBeInstanceOf(AbstractExpression);
        expect(expression.stringify()).toBe(source);
        expect(expression.clone().stringify()).toBe(source);
        if (Array.isArray(input)) {
          expression.tokens.forEach((token, index) => expect(token).toBe(input[index]));
        }
      }
    }
  );

  const invalid = [
    [ConstantExpression, 'null trailing'],
    [PrimitiveConstantExpression, 'user.age'],
    [PrimitiveConstantExpression, '1 + 2'],
    [ConstantExpression, 'save()'],
    [EvaluatedExpression, '$:[1, 2'],
    [EvaluatedExpression, '$:{name:}'],
    [ShorthandExpression, 'save()'],
    [ShorthandExpression, 'user.'],
    [FormatShorthandExpression, 'price:'],
    [FunctionExpression, 'true'],
    [FormatStringExpression, 'Hello {}']
  ] as const;
  it.each(invalid.map(([Type, source]) => [Type.name, Type, source] as const))(
    '%s rejects input outside its syntax: %s',
    (_, Type, source) => {
      expect(() => Type.parse(source)).toThrow(SyntaxError);
    }
  );

  it('distinguishes plain text from a format string without a global parsing mode', () => {
    const text = TextExpression.parse('Hello {user.name}');
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
    expectTypeOf(TextExpression.parse('hello')).toEqualTypeOf<TextExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:[]')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:{}')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(FunctionExpression.parse('$:save()')).toEqualTypeOf<FunctionExpression>();
    expectTypeOf(EvaluatedExpression.parse('$:ready ? true : false')).toEqualTypeOf<EvaluatedExpression>();
    expectTypeOf(FormatStringExpression.parse('Hello')).toEqualTypeOf<FormatStringExpression>();
  });
});
