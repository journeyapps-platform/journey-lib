import { TypeInterface } from '@ja-platform/evaluator';
import { ChoiceType } from './ChoiceType';

export class BooleanType extends ChoiceType {
  static readonly TYPE = 'boolean';

  static isInstanceOf(type: TypeInterface): type is BooleanType {
    return type.name === BooleanType.TYPE;
  }

  constructor() {
    super(BooleanType.TYPE, { multiple: false });
  }
}
