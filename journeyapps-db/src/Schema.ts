import { Schema, PrimitiveTypeName, InferGetType } from '@ja-platform/parser-schema';
import { DBPrimitiveTypeFactory, DBPrimitiveTypeMap } from './types/primitives';
import { ObjectTypeFactory } from './types/ObjectType';
import { QueryTypeFactory } from './types/QueryType';
import { ArrayTypeFactory } from './types/ArrayType';

export class DBSchema extends Schema {
  constructor() {
    super();

    this.registerTypeFactory(new ObjectTypeFactory());
    this.registerTypeFactory(new ArrayTypeFactory());
    this.registerTypeFactory(new QueryTypeFactory());

    // Register all the primitive types
    for (const primitiveName of Object.keys(DBPrimitiveTypeMap)) {
      this.registerTypeFactory(new DBPrimitiveTypeFactory(primitiveName as PrimitiveTypeName));
    }
  }

  getType<T extends string | PrimitiveTypeName>(typeName: T): InferGetType<T, DBPrimitiveTypeMap> {
    return super.getType(typeName);
  }

  primitive<T extends string | PrimitiveTypeName>(name: T): InferGetType<T, DBPrimitiveTypeMap> {
    return super.primitive(name);
  }
}
