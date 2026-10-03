import { TextType as SchemaTextType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';

export class TextType extends DBTypeMixin(SchemaTextType) {
  cast(value: any) {
    return value.toString?.();
  }
}
