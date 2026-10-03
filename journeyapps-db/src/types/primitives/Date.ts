import { Day, pureDate } from '@ja-platform/core-date';
import { DateType as SchemaDateType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';
const moment = require('moment');

// Applies applies DBTypeMixin first and then DBDateTypeMixin to BaseClass.
export class DateType extends DBTypeMixin(SchemaDateType) {
  static DEFAULT_FORMAT = 'MMMM D YYYY';

  valueToJSON(value: any) {
    if (value instanceof Date) {
      return value.toISOString().substring(0, 10);
    } else if (Day.isDay(value)) {
      return value.toISOString();
    } else {
      return null;
    }
  }

  valueFromJSON(value: any) {
    if (typeof value != 'string') {
      return null;
    }
    try {
      var day = new Day(value.substring(0, 10));
      if (this.isDay) {
        return day;
      } else {
        return day.toDate();
      }
    } catch (err) {
      return null;
    }
  }

  clone(value: any) {
    if (this.isDay) {
      return new Day(value);
    } else {
      return new Date(value.getTime());
    }
  }

  format(value: any, format?: string) {
    // Works for Date and Day objects.
    if (Day.isDay(value)) {
      value = value.toDate();
    }
    const d = moment(value).utc();
    return d.format(format ?? DateType.DEFAULT_FORMAT);
  }

  cast(value: any) {
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
