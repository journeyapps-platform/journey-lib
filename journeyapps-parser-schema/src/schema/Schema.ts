import { Version, DEFAULT as DEFAULT_VERSION } from '@ja-platform/parser-common';
import { FunctionType, FunctionTypeFactory } from '../types/FunctionType';
import { Param, ParamFactory } from '../types/Param';
import * as parser from './schemaParser';
import { Variable, VariableFactory } from '../types/Variable';
import { QueryType, QueryTypeFactory } from '../types/collections/QueryType';
import { ArrayType, ArrayTypeFactory } from '../types/collections/ArrayType';
import { Relationship, RelationshipTypeFactory } from '../types/Relationship';
import { ObjectType, ObjectTypeFactory } from '../types/ObjectType';
import { Type } from '../types/Type';
import { ValidationError } from '@ja-platform/core-xml';
import { XMLError, XMLElement } from '@journeyapps/domparser/types';
import { TypeInterface } from '@ja-platform/evaluator';
import { PrimitiveTypeMap, PrimitiveTypeName } from '../types/primitives';
import { PrimitiveTypeFactory, TypeFactory } from './TypeFactory';

export type InferGetType<
  T extends string | PrimitiveTypeName,
  MAP extends { [key in PrimitiveTypeName]: typeof Type } = PrimitiveTypeMap
> = T extends PrimitiveTypeName ? InstanceType<MAP[T]> : ObjectType;

export class Schema {
  typeFactories: { [key: string]: TypeFactory } = {};

  objects: { [index: string]: ObjectType };
  errors: (ValidationError | XMLError)[];

  sourceElement: XMLElement;

  // these are used by the tern defs (legacy editor)
  apiVersion?;
  mobileUserType?;

  // Create a new blank schema. Use schema.loadXml() to load from XML data.
  constructor() {
    this.objects = {};
    this.errors = [];

    this.registerTypeFactory(new VariableFactory());
    this.registerTypeFactory(new ParamFactory());
    this.registerTypeFactory(new FunctionTypeFactory());
    this.registerTypeFactory(new ObjectTypeFactory());
    this.registerTypeFactory(new ArrayTypeFactory());
    this.registerTypeFactory(new QueryTypeFactory());
    this.registerTypeFactory(new RelationshipTypeFactory());

    // Register all the primitive types
    for (const primitiveName of Object.keys(PrimitiveTypeMap)) {
      this.registerTypeFactory(new PrimitiveTypeFactory(primitiveName as PrimitiveTypeName));
    }
  }

  registerTypeFactory(factory: TypeFactory) {
    this.typeFactories[factory.name] = factory;
  }

  getFactory(name: string) {
    return this.typeFactories[name];
  }

  /** Helper function to assist in creating variables */
  variable<T extends TypeInterface = Type>(name?: string, type?: string): Variable<T>;
  variable<T extends TypeInterface = Type>(name?: string, type?: T): Variable<T>;
  variable<T extends TypeInterface = Type>(name?: string, type?: T | string): Variable<T> {
    const _type = typeof type === 'string' ? this.getType(type) : type;
    return this.getFactory(Variable.TYPE).generate<T>({ schema: this, name, type: _type });
  }

  param<T extends TypeInterface = Type>(name?: string, type?: string): Param<T>;
  param<T extends TypeInterface = Type>(name?: string, type?: T): Param<T>;
  param<T extends TypeInterface = Type>(name?: string, type?: T | string): Param<T> {
    const _type = typeof type === 'string' ? this.getType(type) : type;
    return this.getFactory(Param.TYPE).generate<T>({ schema: this, name, type: _type });
  }

  /** Helper function to assist in creating query variables */
  queryVariable(name: string, typeName: string) {
    const objectType = this.getType(typeName);
    const queryType = this.queryType(objectType);
    return this.variable(name, queryType);
  }

  /** Helper function to assist in creating array variables */
  arrayVariable(name: string, typeName: string) {
    const objectType = this.getType(typeName);
    const arrayType = this.arrayType(objectType);
    return this.variable(name, arrayType);
  }

  queryType(objectType: ObjectType) {
    return this.getFactory(QueryType.TYPE).generate({ schema: this, objectType }) as QueryType;
  }

  arrayType(objectType: ObjectType) {
    return this.getFactory(ArrayType.TYPE).generate({ schema: this, objectType }) as ArrayType;
  }

  newObjectType(name?: string) {
    return this.getFactory(ObjectType.TYPE).generate({ schema: this, name }) as ObjectType;
  }

  newRelationship() {
    return this.getFactory(Relationship.TYPE).generate({ schema: this }) as Relationship;
  }

  functionType() {
    return this.getFactory(FunctionType.TYPE).generate({ schema: this }) as FunctionType;
  }

  // Given a type name, return the specified type. Returns `undefined` if the type is not found.
  // The type name may refer to a primitive, or an object type defined in the schema.
  getType<T extends string | PrimitiveTypeName>(typeName: T): InferGetType<T> {
    if (typeName in PrimitiveTypeMap) {
      // primitive
      return this.primitive(typeName);
    }
    // not a primitive - most likely an object
    return this.objects[typeName] as InferGetType<T>;
  }

  primitive<T extends string | PrimitiveTypeName>(name: T): InferGetType<T> {
    if (!(name in PrimitiveTypeMap)) {
      return null;
    }
    const factory = this.getFactory(name);
    if (factory) {
      return factory.generate({ schema: this });
    } else {
      return null;
    }
  }

  loadXml(rawxml: string, options: { apiVersion?: Version; recordSource?: boolean } = {}) {
    const apiVersion = options.apiVersion || DEFAULT_VERSION; // Default to allowing only v2
    let myParser = parser.parser(this, {
      version: apiVersion,
      recordSource: options.recordSource
    });
    myParser.parse(rawxml);
    this.errors = myParser.getErrors();
    return this;
  }

  toJSON() {
    return {
      objects: this.objects
    };
  }
}

export function parser2(schema: Schema) {
  return parser.parser(schema, { version: { v3: false } });
}

export function parser3(schema: Schema) {
  return parser.parser(schema, { version: { v3: true, v3_1: true } });
}
