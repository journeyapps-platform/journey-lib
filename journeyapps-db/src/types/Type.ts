import { TypeInterface } from '@ja-platform/evaluator';
import { Type as SchemaType } from '@ja-platform/parser-schema';

export interface ValueSerializeOptions {
  inlineAttachments?: boolean;
}

type GConstructor<T extends SchemaType = SchemaType> = new (...args: any[]) => T;

export function DBTypeMixin<TBase extends GConstructor, T extends TypeInterface = TypeInterface>(Base: TBase) {
  return class innerTypeClass extends Base {
    valueToJSON(value: any, options?: ValueSerializeOptions) {
      return value;
    }
    valueFromJSON(value: any) {
      return value;
    }
    clone(value: any) {
      return value;
    }
    cast(value: any) {
      return value;
    }
  };
}

export class Type extends DBTypeMixin(SchemaType) {}
