import { Type } from './Type';
import { ScalarType } from './ScalarType';
import { numberType } from './NumberType';

export class IntegerType extends ScalarType<number> {
  static readonly TYPE = 'integer';

  static isInstanceOf(type: Type | null): type is IntegerType {
    return type?._typeName === this.TYPE;
  }

  constructor() {
    super(IntegerType.TYPE);
  }

  is(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
  }

  parse(value: unknown): number {
    return Math.floor(numberType.parse(value));
  }
}

export const integerType = new IntegerType();
