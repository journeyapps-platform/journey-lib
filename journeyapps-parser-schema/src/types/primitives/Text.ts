import { TypeInterface } from '@ja-platform/evaluator';
import { Type } from '../Type';

export class TextType extends Type {
  static readonly TYPE = 'text';

  static isInstanceOf(type: TypeInterface): type is TextType {
    return type.name === TextType.TYPE;
  }

  spec?: string;

  constructor() {
    super(TextType.TYPE, true);
  }

  toJSON() {
    const json = {} as any;
    if (this.spec != null) {
      json.spec = this.spec;
    }
    if (this.subType != null) {
      json.subType = this.subType;
    }
    return json;
  }
}
