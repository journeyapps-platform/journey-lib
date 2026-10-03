import { DatetimeType as SchemaDatetimeType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';
import moment = require('moment');

export class DatetimeType extends DBTypeMixin(SchemaDatetimeType) {
  static DEFAULT_FORMAT = 'MMMM D YYYY h:mm A';

  valueToJSON(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    } else {
      return null;
    }
  }

  valueFromJSON(value: string) {
    if (typeof value == 'string') {
      const parsed = Date.parse(value);
      if (isNaN(parsed)) {
        return null;
      } else {
        return new Date(parsed);
      }
    } else {
      return null;
    }
  }

  format(value: any, format?: string): string {
    return moment(value).format(format ?? DatetimeType.DEFAULT_FORMAT);
  }

  cast(value: any): any {
    if (value instanceof Date) {
      return value;
    } else {
      throw new Error(value + ' is not a Date');
    }
  }

  clone(value: any) {
    return new Date(value.getTime());
  }
}
