import { Type, ObjectType, QueryType } from '@ja-platform/types';
import type { Formatter } from '@ja-platform/types';
import { DateType, PrimitiveType } from '@ja-platform/parser-schema';
import { Day } from '@ja-platform/core-date';
import { Location } from './Location';
import * as uuid from 'uuid';
import { Attachment, toBackendData } from './Attachment';

export interface ValueSerializeOptions {
  inlineAttachments?: boolean;
}

/**
 * Operations on runtime values, independent of descriptor traversal.
 */
export class TypeOperations implements Formatter {
  constructor(readonly baseType: Type) {}

  is(value: unknown): boolean {
    return this.baseType.is(value);
  }

  parse(value: unknown): any {
    return this.baseType.parse(value);
  }

  format(value: any, format?: string): string {
    return this.baseType.format(value, format);
  }

  clone(value: any): any {
    return value;
  }
  valueFromJSON(data: any): any {
    return data;
  }
  valueToJSON(value: any, options?: ValueSerializeOptions): any {
    return value;
  }
}

export class DateOperations extends TypeOperations {
  declare readonly baseType: DateType;
  clone(value: any) {
    if (this.baseType.isDay) {
      return new Day(value);
    } else {
      return new Date(value.getTime());
    }
  }
  valueFromJSON(value: any) {
    if (typeof value != 'string') {
      return null;
    }
    try {
      var day = new Day(value.substring(0, 10));
      if (this.baseType.isDay) {
        return day;
      } else {
        return day.toDate();
      }
    } catch (err) {
      return null;
    }
  }
  valueToJSON(value: any) {
    if (value instanceof Date) {
      return value.toISOString().substring(0, 10);
    } else if (Day.isDay(value)) {
      return value.toISOString();
    } else {
      return null;
    }
  }
}

export class DatetimeOperations extends TypeOperations {
  clone(value: any) {
    return new Date(value.getTime());
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
  valueToJSON(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    } else {
      return null;
    }
  }
}

class LocationOperations extends TypeOperations {
  is(value: unknown): boolean {
    return value instanceof Location;
  }

  parse(value: any): Location {
    if (value instanceof Location) return value;
    if (typeof value === 'object') return new Location(value);
    throw new Error(value + ' is not a valid location');
  }

  clone(value: any) {
    return new Location(value);
  }
  valueFromJSON(value: any) {
    if (Array.isArray(value)) {
      if (value.length < 6) {
        throw new Error(
          'Location array format must have 6 parts, namely [latitude, longitude, altitude, horizontal_accuracy, vertical_accuracy, timestamp]'
        );
      }
      // Array format
      const data = {
        latitude: value[0],
        longitude: value[1],
        altitude: value[2],
        horizontal_accuracy: value[3],
        vertical_accuracy: value[4],
        timestamp: value[5]
      };
      return new Location(data);
    } else {
      // Object format
      return new Location(value);
    }
  }
}

class SingleChoiceIntegerOperations extends TypeOperations {
  valueFromJSON(value: any) {
    if (typeof value == 'number') {
      return value;
    } else {
      return null;
    }
  }
  valueToJSON(value: any) {
    if (typeof value == 'number') {
      return value;
    } else {
      return null;
    }
  }
}

class ObjectOperations extends TypeOperations {
  is(value: any): boolean {
    return (
      value != null &&
      typeof value === 'object' &&
      ObjectType.isInstanceOf(value.type) &&
      value.type.name === this.baseType.name &&
      typeof value._save === 'function'
    );
  }

  parse(value: unknown): unknown {
    if (value == null || typeof value !== 'object') {
      throw new Error(value + ' is not an object');
    }
    if (this.is(value)) return value;
    throw new Error('Expected ' + value + ' to have type ' + this.baseType.name);
  }

  clone(value: { _clone(): unknown }) {
    return value._clone();
  }
}

class QueryOperations extends TypeOperations {
  clone(value: { _clone(): unknown }) {
    return value._clone();
  }
}

export class AttachmentOperations extends TypeOperations {
  is(value: unknown): boolean {
    return Attachment.isAttachment(value);
  }

  protected createValue(value: any): any {
    return new Attachment(value);
  }

  parse(value: unknown): any {
    if (this.is(value)) return value;
    if ((typeof value === 'string' && uuid.validate(value)) || typeof value === 'object') {
      return this.createValue(value);
    }
    throw new Error(value + ' is not a valid id');
  }

  valueFromJSON(value: any) {
    if (value != null) return this.createValue(value);
  }

  valueToJSON(value: Attachment, options?: ValueSerializeOptions) {
    if (!value) return null;
    if (options?.inlineAttachments && typeof value[toBackendData] === 'function') {
      return value[toBackendData]();
    }
    return value.id;
  }
}

/**
 * Resolve value checks, parsing, copying, and wire conversion without replacing the original type.
 */
export function operationsFor(type: Type): TypeOperations {
  switch (type.name) {
    case PrimitiveType.DATE:
      return new DateOperations(type as DateType);
    case PrimitiveType.DATETIME:
      return new DatetimeOperations(type);
    case PrimitiveType.LOCATION:
      return new LocationOperations(type);
    case PrimitiveType.SINGLE_CHOICE_INTEGER:
      return new SingleChoiceIntegerOperations(type);
    case PrimitiveType.ATTACHMENT:
      return new AttachmentOperations(type);
  }
  if (ObjectType.isInstanceOf(type)) return new ObjectOperations(type);
  if (QueryType.isInstanceOf(type)) return new QueryOperations(type);
  return new TypeOperations(type);
}
