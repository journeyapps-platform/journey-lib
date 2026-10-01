import {
  ObjectType as SchemaObjectType,
  ObjectTypeFactory as SchemaObjectTypeFactory
} from '@ja-platform/parser-schema';
import { Query } from '../query/Query';
import { DBTypeMixin } from './Type';

export class ObjectType extends DBTypeMixin(SchemaObjectType) {
  cast(value: any) {
    if (typeof value != 'object') {
      throw new Error(value + ' is not an object');
    }
    if (
      value.type != null &&
      value.type instanceof ObjectType &&
      value.type.name == this.name &&
      typeof value._save == 'function'
    ) {
      // This implies that value is (likely) also an instance of DatabaseObject.
      return value;
    } else {
      throw new Error('Expected ' + value + ' to have type ' + this.name);
    }
  }

  format(value: any): string {
    return value.toString();
  }

  clone(value: Query) {
    return value._clone();
  }
}

export class ObjectTypeFactory extends SchemaObjectTypeFactory {
  generate(event) {
    const instance = new ObjectType(event.name);
    instance.setupVariables(event.schema);
    return instance;
  }
}
