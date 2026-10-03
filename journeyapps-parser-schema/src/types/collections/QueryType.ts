import { AbstractObjectTypeFactory, GenerateTypeEvent } from '../../schema/TypeFactory';
import { Type } from '../Type';
import { ObjectType } from '../ObjectType';
import { TypeInterface } from '@ja-platform/evaluator';

export class QueryType extends Type {
  static readonly TYPE = 'query';

  objectType: ObjectType;

  static isInstanceOf(type: TypeInterface): type is QueryType {
    return type.name === QueryType.TYPE;
  }

  constructor(objectType: ObjectType) {
    super(QueryType.TYPE);
    if (objectType === undefined) {
      throw new Error('objectType is required');
    }

    this.objectType = objectType;
    this.isCollection = true;
  }

  stringify(): string {
    return `${super.stringify()}:${this.objectType.name}`;
  }

  toJSON() {
    return {
      type: QueryType.TYPE,
      object: this.objectType.name
    };
  }
}

export interface GenerateQueryTypeEvent extends GenerateTypeEvent {
  objectType: ObjectType;
}
export class QueryTypeFactory extends AbstractObjectTypeFactory<QueryType, GenerateQueryTypeEvent> {
  constructor() {
    super(QueryType.TYPE);
  }

  generate(event: GenerateQueryTypeEvent): QueryType {
    return new QueryType(event.objectType);
  }
}
