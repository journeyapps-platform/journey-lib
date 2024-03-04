import { AbstractObjectTypeFactory, GenerateTypeEvent } from '../schema/TypeFactory';
import { Type } from './Type';
import { ObjectType } from './ObjectType';
import { XMLElement } from '@journeyapps/domparser/types';
import { TypeInterface } from '@journeyapps/evaluator';

export interface VariableJsonType {
  name: string;
  type: string;
  label?: string;
  [key: string]: any;
}

// Variable constructor. A variable is simply a name and a type (can be null).
export class Variable<T extends Type | TypeInterface = Type> {
  static readonly TYPE = 'variable';

  static isInstanceOf(obj: any): obj is Variable {
    return obj instanceof Variable || 'name' in obj;
  }

  name: string;
  type: T | null;
  errors: any[];
  label?: string;
  relationship?: string;
  isRelationshipId?: boolean;
  isBelongsToId?: boolean;
  sourceTypeName?: string;
  sourceElement: XMLElement;

  // Param specific attributes
  required?: boolean;
  provideValue?: string;

  constructor(name: string, type: T | null) {
    this.name = name;
    this.type = type;
    this.errors = [];
  }

  toJSON() {
    const result: VariableJsonType = {
      name: this.name,
      type: undefined
    };
    if (this.type != null) {
      result.type = this.type.name;
    }

    if (typeof this.label != 'undefined') {
      result.label = this.label;
    }
    if (this.type != null && !(this.type instanceof ObjectType)) {
      const typeJson = this.type.toJSON();
      Object.assign(result, typeJson);
    }

    if (this.relationship != null) {
      result.relationship = this.relationship;
      result.isRelationshipId = this.isRelationshipId;
    }

    if (this.required != null) {
      result.required = this.required;
    }
    if (this.provideValue != null) {
      result.provideValue = this.provideValue;
    }

    return result;
  }
}

export interface GenerateVariableEvent<T extends TypeInterface> extends GenerateTypeEvent {
  name: string;
  type: T;
}

export class VariableFactory<T extends TypeInterface = Type> extends AbstractObjectTypeFactory<
  Variable<T>,
  GenerateVariableEvent<T>
> {
  constructor() {
    super(Variable.TYPE);
  }
  generate<T extends TypeInterface = Type>(event: GenerateVariableEvent<T>): Variable<T> {
    return new Variable<T>(event.name, event.type);
  }
}
