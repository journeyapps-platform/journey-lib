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
    [EvaluatedExpression, '$:save('],
    [FunctionExpression, '$:save('],
    [ShorthandExpression, 'save('],
    [FormatStringExpression, '{$:save(}']
  ] as const)('leaves malformed source handling to the parser: %s', (Type, source) => {
    expect(() => Type.parse(source)).toThrow(SyntaxError);
  });

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
    expect(
      new FormatShorthandExpression({
        expression: 'user.name',
        format: '.2f',
        tokens: [new JSToken('user.name'), new TextToken(':.2f')]
      }).isValid()
    ).toBe(true);
    expect(
      new FormatShorthandExpression({ expression: 'save()', format: '', tokens: [new JSToken('save()')] }).isValid()
    ).toBe(false);
  });
});
