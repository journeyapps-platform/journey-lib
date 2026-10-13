import { Type } from './Type';
import { ScalarType } from './ScalarType';

export class TextType extends ScalarType<string> {
  static readonly TYPE = 'text';

  static isInstanceOf(type: Type | null): type is TextType {
    return type?._typeName === this.TYPE;
  }

  constructor() {
    super('text');
  }

  is(value: unknown): value is string {
    return typeof value === 'string';
  }

  parse(value: unknown): string {
    return String(value ?? '');
  }
}

export const textType = new TextType();
