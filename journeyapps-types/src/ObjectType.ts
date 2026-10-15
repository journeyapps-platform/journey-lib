import { Type } from './Type';

/**
 * A structured value whose declared fields can be resolved independently of values.
 */
export abstract class ObjectType extends Type {
  readonly _typeName: string = 'object';
  abstract getField(name: string): Type | null;

  static isInstanceOf(type: Type | null): type is ObjectType {
    return type?._typeName === 'object';
  }
}
