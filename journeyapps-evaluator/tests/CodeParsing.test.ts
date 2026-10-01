import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCallExpression, isIdentifier } from '@babel/types';
import { FunctionExpression, CodeParser, JavaScriptParser, JSToken } from '../src';

const javascript = new JavaScriptParser();
const countingParser = {
  language: javascript.language,
  parse: vi.fn((source: string) => javascript.parse(source))
};

// Isolate this suite's cache while exercising the same injected parser contract in Node and browsers.
beforeAll(() => {
  vi.stubGlobal('__journeyappsCodeParser', undefined);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  CodeParser.getInstance().clear();
  vi.clearAllMocks();
});

describe('Code parsing batches', () => {
  it('shares cache ownership through the runtime global', () => {
    const cache = CodeParser.getInstance();
    const globals = globalThis as typeof globalThis & {
      __journeyappsCodeParser?: CodeParser;
    };
    expect(globals.__journeyappsCodeParser).toBe(cache);
    expect(CodeParser.getInstance()).toBe(cache);
    cache.parse('save()', countingParser);
    cache.clear();
    cache.parse('save()', countingParser);
    expect(countingParser.parse).toHaveBeenCalledTimes(2);
  });

  it('uses injected grammars with separate cached results for the same source', () => {
    const parser = CodeParser.getInstance();
    const first = { language: 'first', parse: vi.fn((source: string) => ({ value: source.toUpperCase() })) };
    const second = { language: 'second', parse: vi.fn((source: string) => ({ value: source.toLowerCase() })) };
    const result = parser.parse('Hello', first);
    result.value = 'edited';
    expect(parser.parse('Hello', first)).toEqual({ value: 'HELLO' });
    expect(parser.parse('Hello', second)).toEqual({ value: 'hello' });
    expect(first.parse).toHaveBeenCalledTimes(1);
    expect(second.parse).toHaveBeenCalledTimes(1);
    parser.clear();
    expect(parser.parse('Hello', first)).toEqual({ value: 'HELLO' });
    expect(first.parse).toHaveBeenCalledTimes(2);
  });

  it('reuses parsing while keeping occurrence offsets and mutable trees independent', () => {
    CodeParser.getInstance().parse('save(user.name)', countingParser);
    const first = new JSToken('save(user.name)', 2);
    const second = new JSToken('save(user.name)', 42);
    expect(countingParser.parse).toHaveBeenCalledTimes(1);
    expect(second.start).toBe(42);
    expect(second.end).toBe(57);
    expect(second.ast).toEqual(first.ast);
    expect(second.ast).not.toBe(first.ast);
    if (isCallExpression(first.ast) && isIdentifier(first.ast.callee)) {
      first.ast.callee.name = 'changed';
    }
    const clone = first.clone();
    expect(clone.functionName()).toBe('save');
    expect(clone.ast).toEqual(second.ast);
    expect(clone.ast).not.toBe(second.ast);
    expect(countingParser.parse).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh batch without invalidating existing expressions or their source edits', () => {
    CodeParser.getInstance().parse('save((user.name), true); // keep', countingParser);
    const expression = FunctionExpression.parse('$:save((user.name), true); // keep');
    CodeParser.getInstance().clear();
    CodeParser.getInstance().parse('save((user.name), true); // keep', countingParser);
    const next = FunctionExpression.parse(expression.stringify());
    expect(countingParser.parse).toHaveBeenCalledTimes(2);
    expect(expression.stringify()).toBe(next.stringify());
    expect((expression.code as JSToken).hasTrailingLineComment).toBe(true);
    expect(expression.code.sourceOf(expression.arguments[0])).toBe('(user.name)');
    expect(expression.withName('send').stringify()).toBe('$:send((user.name), true); // keep');
  });

  it('keys results by exact source, including comments and whitespace', () => {
    const sources = ['save(true)', ' save(true)', 'save(true) /* keep */'];
    for (const source of sources) {
      CodeParser.getInstance().parse(source, countingParser);
      expect(new JSToken(source).stringify()).toBe(source);
      expect(new JSToken(source, 10).stringify()).toBe(source);
    }
    expect(countingParser.parse).toHaveBeenCalledTimes(3);
  });

  it('bounds retained results across long parsing batches', () => {
    const cache = CodeParser.getInstance();
    cache.parse('first()', countingParser);
    for (let index = 0; index < 1000; index++) {
      cache.parse(`save(${index})`, countingParser);
    }
    vi.clearAllMocks();
    cache.parse('save(999)', countingParser);
    expect(countingParser.parse).not.toHaveBeenCalled();
    cache.parse('first()', countingParser);
    expect(countingParser.parse).toHaveBeenCalledTimes(1);
  });

  it('keeps syntax failures strict across repeated attempts and cache clears', () => {
    expect(() => new JSToken('save(')).toThrow(SyntaxError);
    expect(() => new JSToken('save(')).toThrow(SyntaxError);
    CodeParser.getInstance().clear();
    expect(() => new JSToken('save(')).toThrow(SyntaxError);
    expect(new JSToken('save()').isCallExpression()).toBe(true);
  });
});
