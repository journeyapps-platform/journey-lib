import { DBTypeMixin } from './Type';
import { ArrayType as SchemaArrayType, ArrayTypeFactory as BaseTypeFactory } from '@ja-platform/parser-schema';

export class ArrayType extends DBTypeMixin(SchemaArrayType) {}

export class ArrayTypeFactory extends BaseTypeFactory {
  generate(event) {
    return new ArrayType(event.objectType);
  }
}
