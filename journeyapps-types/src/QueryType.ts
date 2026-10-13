import { Type } from './Type';
import { ObjectType } from './ObjectType';

/**
 * A query whose results share a value type.
 */
export class QueryType extends Type {
  readonly _typeName = 'query';
  readonly name = 'query';
  readonly isCollection = true;

  constructor(readonly itemType: Type) {
    super('query');
  }

  static isInstanceOf(type: Type | null): type is QueryType {
    return type?._typeName === 'query';
  }

  is(value: any): boolean {
    return (
      ObjectType.isInstanceOf(value?.type) &&
      value.type.name === this.itemType.name &&
      typeof value._fetch === 'function'
    );
  }

  parse(value: unknown): unknown {
    if (this.is(value)) return value;
    throw new Error(`Expected value to have query type ${this.itemType.name}`);
  }

  stringify(): string {
    return `${this.name}:${this.itemType.name}`;
  }

  toJSON() {
    return { type: this.name, object: this.itemType.name };
  }
}
