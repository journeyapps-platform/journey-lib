import { describe, expect, it } from 'vitest';
import {
  AbstractToken,
  JSToken,
  PrefixToken,
  PlaceholderToken,
  TextToken,
  FunctionExpression,
  IdentifierToken
} from '../src';

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
  it.each([
    ['$:', true],
    ['query:', true],
    ['query', false],
    [':', false]
  ])('validates prefix syntax: %s', (source, valid) => {
    expect(new PrefixToken(0, source).isValid()).toBe(valid);
  });

  it.each([
    ['push_notification', true],
    ['$object', true],
    ['push-notification', false],
    ['2items', false]
  ])('validates identifier syntax: %s', (source, valid) => {
    expect(new IdentifierToken(source).isValid()).toBe(valid);
  });

  it('does not accept declaration prefixes as JavaScript evaluation prefixes', () => {
    const expression = new FunctionExpression({ tokens: [new PrefixToken(0, 'query:'), new JSToken('load()', 6)] });
    expect(expression.isValid()).toBe(false);
  });

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

describe('JavaScript free identifiers', () => {
  it('includes nested calls and computed keys without including local bindings or property names', () => {
    const token = new JSToken('format(load(item), rows.map(row => row[field] + item.price), Math.round(view.amount))');
    expect(token.freeIdentifiers).toEqual(['format', 'load', 'item', 'rows', 'field', 'Math', 'view']);
    expect(token.clone().freeIdentifiers).toEqual(token.freeIdentifiers);
    expect(Object.isFrozen(token.freeIdentifiers)).toBe(true);
  });

  it('respects destructuring, shorthand properties, and bindings used before their declarations', () => {
    const token = new JSToken(
      '(function ({ value = fallback }) { return { value, outer, result: local() }; function local() { return extra; } })(input)'
    );
    expect(token.freeIdentifiers).toEqual(['fallback', 'outer', 'extra', 'input']);
  });
});
