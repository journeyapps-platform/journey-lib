import { Type, TextType as ValueTextType } from '@ja-platform/types';

export class TextType extends ValueTextType {
  static readonly TYPE = 'text';

  static isInstanceOf(type: Type): type is TextType {
    return type?._typeName === TextType.TYPE;
  }

  spec?: string;
  subType?: string;

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
