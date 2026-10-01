/**
 * A source node. Containers expose their children and assemble their source recursively.
 */
export abstract class AbstractToken {
  protected constructor(readonly start = 0) {}

  abstract clone(): AbstractToken;

  get children(): readonly AbstractToken[] {
    return [];
  }

  get end(): number {
    return this.start + this.stringify().length;
  }

  stringify(): string {
    return this.children.map((child) => child.stringify()).join('');
  }
}

export type ExpressionSource = string | readonly AbstractToken[];
