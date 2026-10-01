import { BooleanType as SchemaBooleanType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';

export class BooleanType extends DBTypeMixin(SchemaBooleanType) {
  format(value: any): string {
    const option = this.options[value];
    if (option == null) {
      return '< invalid value >';
    } else {
      return option.label;
    }
  }
}
