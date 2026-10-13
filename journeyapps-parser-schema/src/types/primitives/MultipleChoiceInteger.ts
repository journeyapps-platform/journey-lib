import { ChoiceType } from './ChoiceType';

export class MultipleChoiceIntegerType extends ChoiceType {
  static readonly TYPE = 'multiple-choice-integer';

  constructor() {
    super(MultipleChoiceIntegerType.TYPE, { multiple: true });
  }

  setOptionLabels(labels: string[]) {
    this.options = {};
    for (let i = 0; i < labels.length; i++) {
      this.addOption(i, labels[i], i);
    }
  }

  is(value: any): boolean {
    return Array.isArray(value) && value.every((item) => this.options[item] != null);
  }

  parse(value: any) {
    if (!(value instanceof Array)) {
      throw new Error(value + ' is not an array');
    }

    for (let i = 0; i < value.length; i++) {
      const index = value[i];
      const option = this.options[index];
      if (option == null) {
        throw new Error(index + ' is not a valid option');
      }
    }

    return value;
  }
}
