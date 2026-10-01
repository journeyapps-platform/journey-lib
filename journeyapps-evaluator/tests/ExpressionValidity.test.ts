import { describe, expect, it } from 'vitest';
import {
  EvaluatedExpression,
  FunctionExpression,
  ShorthandExpression,
  FormatShorthandExpression,
  FormatStringExpression,
  JSToken,
  PrefixToken,
  TextToken,
  PlaceholderToken
} from '../src';

/**
 * Validity can be checked after constructing or editing an expression without requiring a parser match.
 */
describe('Expression validity', () => {
  it.each([
    [EvaluatedExpression, '$:true', 'true'],
    [FunctionExpression, '$:save()', '$:true'],
    [ShorthandExpression, 'user.name', 'save()'],
    [FormatStringExpression, 'Hello {user.name}', 'Hello {}']
  ] as const)(
    'inspects valid and invalid %s source without constructor validation exceptions',
    (Type, valid, invalid) => {
      const expression = new Type({ expression: valid });
      expect(expression.isValid()).toBe(true);
      const other = new Type({ expression: invalid });
      expect(other.stringify()).toBe(invalid);
      expect(other.isValid()).toBe(false);
      expect(other.clone().isValid()).toBe(false);
    }
  );

  it.each([EvaluatedExpression, FunctionExpression, ShorthandExpression, FormatStringExpression])(
    'retains malformed source for explicit validation: %s',
    (Type) => {
      const source = Type === FormatStringExpression ? '{$:save(}' : '$:save(';
      const expression = new Type({ expression: source });
      expect(expression.stringify()).toBe(source);
      expect(expression.isValid()).toBe(false);
    }
  );

  it('validates supplied token structure and nested placeholders', () => {
    const call = new FunctionExpression({ expression: '', tokens: [new PrefixToken(), new JSToken('true')] });
    expect(call.isValid()).toBe(false);
    const missingCode = new EvaluatedExpression({ expression: '', tokens: [new PrefixToken()] });
    expect(missingCode.isValid()).toBe(false);
    const reversed = new EvaluatedExpression({ expression: '', tokens: [new JSToken('true'), new PrefixToken()] });
    expect(reversed.isValid()).toBe(false);
    const format = new FormatStringExpression({ expression: '', tokens: [new PlaceholderToken(call)] });
    expect(format.isValid()).toBe(false);
    expect(new FormatStringExpression({ expression: '', tokens: [new JSToken('save()')] }).isValid()).toBe(false);
    expect(new ShorthandExpression({ expression: '', tokens: [new TextToken('user.name')] }).isValid()).toBe(false);
    expect(new FormatShorthandExpression({ expression: 'user.name', format: '.2f' }).isValid()).toBe(true);
    expect(new FormatShorthandExpression({ expression: 'save()', format: '' }).isValid()).toBe(false);
  });
});
