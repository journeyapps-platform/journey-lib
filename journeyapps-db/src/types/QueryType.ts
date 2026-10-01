import { QueryType as SchemaQueryType, QueryTypeFactory as SchemaQueryTypeFactory } from '@ja-platform/parser-schema';
import { Query } from '../query/Query';
import { ObjectType } from './ObjectType';
import { DBTypeMixin } from './Type';

export class QueryType extends DBTypeMixin(SchemaQueryType) {
  // This might look very similar to ObjectType, but here we are checking value.fetch instead of value.save.
  cast(value: any) {
    if (typeof value != 'object') {
      throw new Error(value + ' is not an object');
    }
    const thisTypeName = this.objectType.name;
    if (
      value.type != null &&
      value.type instanceof ObjectType &&
      value.type.name == thisTypeName &&
      typeof value._fetch == 'function'
    ) {
      return value;
    } else {
      // We do not print the value here, since it may be a massive array.
      throw new Error('Expected value to have query type ' + thisTypeName);
    }
  }

  clone(value: Query) {
    return value._clone();
  }
}

export class QueryTypeFactory extends SchemaQueryTypeFactory {
  generate(event) {
    return new QueryType(event.objectType);
  }
}
