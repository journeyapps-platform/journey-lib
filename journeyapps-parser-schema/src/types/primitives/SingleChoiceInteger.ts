import { EnumOption } from '../EnumOption';
import { ChoiceType } from './ChoiceType';

export class SingleChoiceIntegerType extends ChoiceType {
  static readonly TYPE = 'single-choice-integer';

  constructor() {
    super(SingleChoiceIntegerType.TYPE, { multiple: false });
  }

  setOptionLabels(labels: string[]) {
    this.options = {};
    for (let i = 0; i < labels.length; i++) {
      this.addOption(i, labels[i], i);
    }
  }

  is(value: any): boolean {
    return typeof value === 'number' && this.options[value] != null;
  }

  parse(value: any) {
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
