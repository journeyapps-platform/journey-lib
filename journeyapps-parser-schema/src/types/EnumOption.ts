import { XMLElement } from '@journeyapps/domparser/types';

export class EnumOption {
  /** They key */
  value: string | number | boolean;

  label: string;

  index: number;

  sourceElement: XMLElement;

  static isInstanceOf(value: any): value is EnumOption {
    return (
      value instanceof EnumOption || (typeof value == 'object' && value != null && 'value' in value && 'label' in value)
    );
  }

  constructor(key: string | number | boolean, label: string, index?: number) {
    this.value = key;
    this.label = label;
    this.index = index;
  }

  toJSON() {
    return {
      value: this.value,
      label: this.label,
      index: this.index
    };
  }
}
