import { Type } from './Type';
import { ScalarType } from './ScalarType';

export class NumberType extends ScalarType<number> {
  static readonly TYPE = 'number';

  static isInstanceOf(type: Type | null): type is NumberType {
    return type?._typeName === this.TYPE;
  }

  constructor() {
    super('number');
  }

  is(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  parse(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    throw new SyntaxError('Expected a finite number.');
  }
  format(value: any, format?: string): string {
    if (typeof value != 'number') {
      return 'NaN';
    }
    if (format == null) {
      const variable = value.toString();
      const fixed = value.toFixed(6);
      if (variable.length < fixed.length) {
        if (variable.indexOf('.') == -1 && variable.indexOf(',') == -1) {
          // We want to append .0 to integers
          return value.toFixed(1);
        } else {
          return variable;
        }
      } else {
        return fixed;
      }
    } else {
      if (format.length >= 3 && format[0] == '.' && format[format.length - 1] == 'f') {
        var digits = parseInt(format.substring(1, format.length - 1), 10);
        if (digits >= 0 && digits < 20) {
          return value.toFixed(digits);
        } else {
          return value.toFixed(6);
        }
      }
      return value.toString();
    }
  }
}

export const numberType = new NumberType();
