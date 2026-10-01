import { AbstractToken } from '../AbstractToken';

/**
 * Original text, including any escaped format-string braces.
 */
export class TextToken extends AbstractToken {
  static fromValue(value: string, start = 0): TextToken {
    return new TextToken(value.replace(/{/g, '{{').replace(/}/g, '}}'), start);
  }

  constructor(readonly source: string, start = 0) {
    super(start);
    Object.freeze(this);
  }

  stringify(): string {
    return this.source;
  }

  clone(): this {
    return this;
  }

  value(): string {
    return this.source.replace(/{{/g, '{').replace(/}}/g, '}');
  }
}
