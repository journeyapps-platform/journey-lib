import { TypeInterface } from '@ja-platform/evaluator';
import { EnumOption } from '../EnumOption';
import { Type } from '../Type';

export interface ChoiceTypeConfig {
  multiple: boolean;
}

export abstract class ChoiceType extends Type {
  static isInstanceOf(type: TypeInterface): type is ChoiceType {
    return 'options' in type && 'addOption' in type;
  }

  options: { [key: string]: EnumOption };
  multipleOptions?: boolean;

  constructor(name: string, config?: ChoiceTypeConfig) {
    super(name);
    this.options = {};
    this.multipleOptions = config?.multiple;
    this.hasOptions = false;
  }

  addOption(value: any, label: string, index: number): EnumOption {
    if (value in this.options) {
      throw new Error("key '" + value + "' is already used");
    }
    this.options[value] = new EnumOption(value, label, index);
    this.hasOptions = true;
    return this.options[value];
  }

  values(obj: any) {
    return Object.keys(obj).map((key) => {
      return obj[key].toJSON();
    });
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      options: Object.keys(this.options).map((key) => {
        return this.options[key].toJSON();
      })
    };
  }
}
