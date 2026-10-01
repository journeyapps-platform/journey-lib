import { NumberType as SchemaNumberType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';

export class NumberType extends DBTypeMixin(SchemaNumberType) {
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

  cast(value: any) {
    if (typeof value == 'number') {
      return value;
    } else {
      throw new Error(value + ' is not a number');
    }
  }
}
