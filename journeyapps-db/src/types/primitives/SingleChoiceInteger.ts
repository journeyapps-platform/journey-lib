import { EnumOption, SingleChoiceIntegerType as SchemaSingleChoiceIntegerType } from '@journeyapps/parser-schema';
import { DBTypeMixin } from '../Type';

export class SingleChoiceIntegerType extends DBTypeMixin(SchemaSingleChoiceIntegerType) {
  format(value: any): string {
    const option = this.options[value];
    if (option == null) {
      return '< invalid value >';
    } else {
      return option.label;
    }
  }

  cast(value: any) {
    let option: number = null;
    if (typeof value == 'number') {
      option = value;
    } else if (value instanceof EnumOption) {
      // We convert enums to a plain integer
      option = value.value as number;
    }
    if (this.options[option] == null) {
      throw new Error(value + ' is not a valid enum value');
    } else {
      return option;
    }
  }
}