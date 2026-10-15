import { Version, DEFAULT as DEFAULT_VERSION } from '@ja-platform/parser-common';
import { FunctionType, FunctionTypeFactory } from '../types/FunctionType';
import { Param, ParamFactory } from '../types/Param';
import * as parser from './schemaParser';
import { Variable, VariableFactory } from '../types/Variable';
import { Relationship, RelationshipTypeFactory } from '../types/Relationship';
import { SchemaModelType, SchemaModelTypeFactory } from '../types/SchemaModelType';
import { Type } from '@ja-platform/types';
import { ValidationError } from '@ja-platform/core-xml';
import { XMLError, XMLElement } from '@journeyapps/domparser/types';
import { PrimitiveTypeMap, PrimitiveTypeName } from '../types/primitives';
import { PrimitiveTypeFactory, TypeFactory } from './TypeFactory';

export type InferGetType<
  T extends string | PrimitiveTypeName,
  MAP extends { [key in PrimitiveTypeName]: new (...args: any[]) => Type } = PrimitiveTypeMap,
  Model extends SchemaModelType = SchemaModelType
> = T extends PrimitiveTypeName ? InstanceType<MAP[T]> : Model;

export class Schema {
  typeFactories: { [key: string]: TypeFactory } = {};

  objects: { [index: string]: SchemaModelType };
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
    this.registerTypeFactory(new SchemaModelTypeFactory());
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
  variable<T extends Type = Type>(name?: string, type?: string): Variable<T>;
  variable<T extends Type = Type>(name?: string, type?: T): Variable<T>;
  variable<T extends Type = Type>(name?: string, type?: T | string): Variable<T> {
    const _type = typeof type === 'string' ? this.getType(type) : type;
    return this.getFactory(Variable.TYPE).generate<T>({ schema: this, name, type: _type });
  }

  param<T extends Type = Type>(name?: string, type?: string): Param<T>;
  param<T extends Type = Type>(name?: string, type?: T): Param<T>;
  param<T extends Type = Type>(name?: string, type?: T | string): Param<T> {
    const _type = typeof type === 'string' ? this.getType(type) : type;
    return this.getFactory(Param.TYPE).generate<T>({ schema: this, name, type: _type });
  }

  newObjectType(name?: string) {
    return this.getFactory(SchemaModelType.TYPE).generate({ schema: this, name }) as SchemaModelType;
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
