import { EnumOption, SingleChoiceIntegerType as SchemaSingleChoiceIntegerType } from '@journeyapps/parser-schema';
import { DBTypeMixin } from '../Type';

export class SingleChoiceIntegerType extends DBTypeMixin(SchemaSingleChoiceIntegerType) {
  static DEFAULT_INVALID_VALUE = '< invalid value >';

  valueToJSON(value: any) {
    if (typeof value == 'number') {
      return value;
    } else {
      return null;
    }
  }

  valueFromJSON(value: any) {
    if (typeof value == 'number') {
      return value;
    } else {
      return null;
    }
  }

  format(value: any): string {
    const option = this.options[value];
    if (option == null) {
      return SingleChoiceIntegerType.DEFAULT_INVALID_VALUE;
    } else {
      return option.label;
    }
  }

  cast(value: any) {
    let option: number = null;
    if (typeof value == 'number') {
      option = value;
    } else if (EnumOption.isInstanceOf(value)) {
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
