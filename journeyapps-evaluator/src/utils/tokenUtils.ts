import { AbstractToken, ExpressionSource } from '../tokens/AbstractToken';
import { CodeToken } from '../tokens/code/CodeToken';
import { JSToken } from '../tokens/code/JSToken';
import { FUNCTION_PREFIX } from '../tokens/code/PrefixToken';

export function stringify(source: ExpressionSource): string {
  let text: string;
  if (typeof source === 'string') {
    text = source;
  } else {
    text = source.map((token) => token.stringify()).join('');
  }
  return text;
}

export function codeToken(tokens: readonly AbstractToken[]): CodeToken {
  const code = tokens.filter((token): token is CodeToken => token instanceof CodeToken);
  if (code.length !== 1) throw new SyntaxError('Expected one code token.');
  return code[0];
}

export function javascriptToken(tokens: readonly AbstractToken[]): JSToken {
  const javascript = tokens.filter((token): token is JSToken => token instanceof JSToken);
  if (javascript.length !== 1) {
    throw new SyntaxError('Expected one JavaScript token.');
  }
  return javascript[0];
}

export function hasFunctionPrefix(source: string): boolean {
  return source.slice(leadingTrivia(source).length).startsWith(FUNCTION_PREFIX);
}

/**
 * Whitespace and comments before a Journey prefix remain original source text.
 */
export function leadingTrivia(source: string): string {
  return source.match(/^(?:\s+|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*(?:\r?\n|$))*/)[0];
}
