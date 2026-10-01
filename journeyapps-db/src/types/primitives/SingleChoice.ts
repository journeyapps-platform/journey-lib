import { SingleChoiceType as SchemaSingleChoiceType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';

export class SingleChoiceType extends DBTypeMixin(SchemaSingleChoiceType) {
  static DEFAULT_INVALID_VALUE = '< invalid value >';

  format(value: any): string {
    const option = this.options[value];
    if (option == null) {
      return SingleChoiceType.DEFAULT_INVALID_VALUE;
    } else {
      return option.label;
    }
  }
}
