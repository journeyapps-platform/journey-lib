import { Type } from './Type';
import { ScalarType } from './ScalarType';

export class BooleanType extends ScalarType<boolean> {
  static readonly TYPE = 'boolean';

  static isInstanceOf(type: Type | null): type is BooleanType {
    return type?._typeName === this.TYPE;
  }

  constructor() {
    super('boolean');
  }

  is(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  parse(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const text = value.trim();
      if (text === 'true' || text === 'false') return text === 'true';
      if (text !== '' && Number.isFinite(Number(text))) return Number(text) !== 0;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    throw new SyntaxError('Expected a boolean or finite number.');
  }
}

export const booleanType = new BooleanType();
