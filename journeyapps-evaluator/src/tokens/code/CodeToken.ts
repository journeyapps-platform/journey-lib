import { AbstractToken } from '../AbstractToken';

/**
 * Original source and executable code for a language-specific token.
 * Subclasses own their parser and syntax tree.
 */
export abstract class CodeToken extends AbstractToken {
  abstract readonly code: string;
  protected constructor(readonly source: string, start = 0) {
    super(start);
  }
  stringify(): string {
    return this.source;
  }
  abstract clone(): CodeToken;
}
