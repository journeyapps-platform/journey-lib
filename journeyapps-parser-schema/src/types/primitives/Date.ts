import { Day, pureDate } from '@ja-platform/core-date';
import moment = require('moment');
import { Type } from '@ja-platform/types';

export class DateType extends Type {
  static DEFAULT_FORMAT = 'MMMM D YYYY';
  readonly _typeName = 'date';
  static readonly TYPE = 'date';

  static isInstanceOf(type: Type | null): type is DateType {
    return type?._typeName === DateType.TYPE;
  }
  isDay?: boolean;

  constructor() {
    super(DateType.TYPE);
  }

  // Return either {} or {isDay: true}.
  // For consistency, we never return {isDay: undefined} or {isDay: false}.
  toJSON(): any {
    const json: { isDay?: boolean } = super.toJSON();
    if (this.isDay) {
      json.isDay = true;
    }
    return json;
  }
  format(value: any, format?: string) {
    // Works for Date and Day objects.
    if (Day.isDay(value)) {
      value = value.toDate();
    }
    const d = moment(value).utc();
    return d.format(format ?? DateType.DEFAULT_FORMAT);
  }

  is(value: any): boolean {
    return this.isDay ? Day.isDay(value) : value instanceof Date;
  }

  parse(value: any) {
    if (this.isDay) {
      if (Day.isDay(value)) {
        return value;
      } else if (value instanceof Date) {
        // Convert from local timezone
        return new Day(value);
      } else {
        throw new Error(value + ' is not a Day');
      }
    } else {
      if (value instanceof Date) {
        // Assume UTC timezone
        return pureDate(value);
      } else if (Day.isDay(value)) {
        return value.toDate();
      } else {
        throw new Error(value + ' is not a Date');
      }
    }
  }
}
