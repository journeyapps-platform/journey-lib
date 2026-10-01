import { describe, expect, it } from 'vitest';
import { JSToken, JSReference } from '../src';

function replaceMessage(reference: JSReference): JSToken | null {
  let replacement: JSToken | null = null;
  if (reference.name === 'message') {
    replacement = new JSToken("'Hello'");
  }
  return replacement;
}

describe('JavaScript reference rewriting', () => {
  it.each([
    ['print(message)', "print('Hello')"],
    ['worker.message', 'worker.message'],
    ['worker[message]', "worker['Hello']"],
    ['items.map(message => message.name)', 'items.map(message => message.name)'],
    ['({ message })', "({ message: 'Hello' })"],
    ['({ message: message })', "({ message: 'Hello' })"],
    [
      "(() => { const message = 'local'; return message; })()",
      "(() => { const message = 'local'; return message; })()"
    ],
    [
      '(() => { const { message } = source; return message; })()',
      '(() => { const { message } = source; return message; })()'
    ],
    [
      '(() => { try {} catch (message) { return message; } })()',
      '(() => { try {} catch (message) { return message; } })()'
    ],
    ['message + (() => { let message; return message; })()', "'Hello' + (() => { let message; return message; })()"],
    ['((message = messageFallback) => message)()', '((message = messageFallback) => message)()']
  ])('distinguishes references from properties and local bindings: %s', (source, expected) => {
    const original = new JSToken(source, 10);
    const rewritten = original.rewriteReferences(replaceMessage);
    expect(rewritten.stringify()).toBe(expected);
    expect(rewritten.start).toBe(10);
    expect(original.stringify()).toBe(source);
    expect(rewritten.ast).not.toBe(original.ast);
  });

  it('supplies rewritten nested arguments before replacing their enclosing calls', () => {
    const original = new JSToken('send(greet(message), ...items)', 5);
    const visited: string[] = [];
    const rewritten = original.rewriteReferences((reference) => {
      visited.push(reference.name);
      let replacement: JSToken | null = replaceMessage(reference);
      if (reference.name === 'items') {
        replacement = new JSToken('view.items');
      } else if (reference.isCall && ['greet', 'send'].includes(reference.name)) {
        const name = reference.name === 'greet' ? 'hello' : 'log';
        replacement = new JSToken(`${name}(${reference.arguments.map((argument) => argument.stringify()).join(', ')})`);
      }
      return replacement;
    });
    expect(rewritten.stringify()).toBe("log(hello('Hello'), ...view.items)");
    expect(visited).toEqual(['message', 'greet', 'items', 'send']);
    expect(original.stringify()).toBe('send(greet(message), ...items)');
  });

  it('preserves grouped arguments and their source positions', () => {
    const original = new JSToken('send((message), value)', 20);
    const rewritten = original.rewriteReferences((reference) => {
      if (reference.isCall && reference.name === 'send') {
        expect(reference.arguments.map((argument) => argument.stringify())).toEqual(["('Hello')", 'value']);
        expect(reference.arguments[0].start).toBe(25);
        return new JSToken(`log(${reference.arguments.map((argument) => argument.stringify()).join(', ')})`);
      }
      return replaceMessage(reference);
    });
    expect(rewritten.stringify()).toBe("log(('Hello'), value)");
  });

  it('retains surrounding whitespace, comments and semicolons', () => {
    const original = new JSToken(' /* before */ print(/* argument */ message); // after', 7);
    const rewritten = original.rewriteReferences(replaceMessage);
    expect(rewritten.stringify()).toBe(" /* before */ print(/* argument */ 'Hello'); // after");
    expect(rewritten.hasTrailingLineComment).toBe(true);
  });

  it('keeps replacement precedence and expands object shorthand values', () => {
    const rewritten = new JSToken('message * 2 + obj[message]').rewriteReferences((reference) => {
      let replacement: JSToken | null = null;
      if (reference.name === 'message') {
        replacement = new JSToken('left + right');
      }
      return replacement;
    });
    expect(rewritten.stringify()).toBe('(left + right) * 2 + obj[(left + right)]');
    expect(new JSToken('({ message })').rewriteReferences(() => new JSToken('left + right')).stringify()).toBe(
      '({ message: (left + right) })'
    );
  });

  it('keeps member and constructor syntax valid for replacement values', () => {
    expect(new JSToken('message.toString()').rewriteReferences(() => new JSToken('1')).stringify()).toBe(
      '(1).toString()'
    );
    expect(new JSToken('new message()').rewriteReferences(() => new JSToken('getConstructor()')).stringify()).toBe(
      'new (getConstructor())()'
    );
  });

  it('does not substitute newly inserted references a second time', () => {
    const rewritten = new JSToken('first + second').rewriteReferences((reference) => {
      let replacement: JSToken | null = null;
      if (reference.name === 'first') {
        replacement = new JSToken('second');
      } else if (reference.name === 'second') {
        replacement = new JSToken('third');
      }
      return replacement;
    });
    expect(rewritten.stringify()).toBe('second + third');
  });

  it('only exposes unbound direct calls and preserves unchanged optional calls', () => {
    const visited: string[] = [];
    const source = 'send?.(message) + ((send) => send(message))(local)';
    const rewritten = new JSToken(source).rewriteReferences((reference) => {
      if (reference.isCall) {
        visited.push(reference.name);
      }
      return replaceMessage(reference);
    });
    expect(visited).toEqual(['send']);
    expect(rewritten.stringify()).toBe("send?.('Hello') + ((send) => send('Hello'))(local)");
  });
});
