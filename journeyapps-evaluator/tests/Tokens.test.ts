import { describe, expect, it } from 'vitest';
import { AbstractToken, JSToken, PrefixToken, PlaceholderToken, TextToken, FunctionExpression } from '../src';

class ContainerToken extends AbstractToken {
  constructor(readonly tokens: readonly AbstractToken[]) {
    super();
  }
  get children(): readonly AbstractToken[] {
    return this.tokens;
  }
  clone(): ContainerToken {
    return new ContainerToken(this.children.map((token) => token.clone()));
  }
}

describe('Source token trees', () => {
  it('assembles containers recursively and exposes source offsets', () => {
    const expression = FunctionExpression.parse([new PrefixToken(20), new JSToken('save(true)', 22)]);
    const placeholder = new PlaceholderToken(expression, 19);
    const tree = new ContainerToken([new TextToken('Before '), placeholder, new TextToken(' after')]);
    expect(tree.raw()).toBe('Before {$:save(true)} after');
    expect(placeholder.children).toBe(expression.tokens);
    expect(placeholder.end).toBe(33);
    expect(expression.codeToken.start).toBe(22);
    expect((expression.codeToken as JSToken).ast.type).toBe('CallExpression');
  });

  it.each([
    ` save('it\\'s fine', true, 1e3) /* keep this */ `,
    'value / 2 + /[{}]/g.test(value)',
    'save(`outer ${`inner ${value}`}`)',
    'obj["quoted\\\\path"].name',
    'π + 0xff + 0b10 + 1_000',
    'save(); // retained'
  ])('retains JavaScript source independently of the Babel AST: %s', (source) => {
    const token = new JSToken(source, 7);
    expect(token.raw()).toBe(source);
    expect(token.end).toBe(source.length + 7);
    const clone = token.clone();
    expect(clone.ast).not.toBe(token.ast);
    expect(clone.raw()).toBe(source);
  });

  it('encodes constructed literal text for its destination syntax', () => {
    expect(TextToken.fromValue('{name}').raw()).toBe('{{name}}');
    expect(new TextToken('{{name}}').decodedText).toBe('{name}');
  });
});
