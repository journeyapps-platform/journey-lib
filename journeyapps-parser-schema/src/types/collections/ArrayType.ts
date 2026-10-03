import { AbstractObjectTypeFactory, GenerateTypeEvent } from '../../schema/TypeFactory';
import { Type } from '../Type';
import { ObjectType } from '../ObjectType';
import { TypeInterface } from '@ja-platform/evaluator';

export class ArrayType extends Type {
  static readonly TYPE = 'array';
  objectType: ObjectType;

  static isInstanceOf(type: TypeInterface): type is ArrayType {
    return type.name === ArrayType.TYPE;
  }

  constructor(objectType: ObjectType) {
    super(ArrayType.TYPE);

    this.objectType = objectType;
    this.isCollection = true;
  }

  stringify(): string {
    return `${super.stringify()}:${this.objectType.name}`;
  }

  toJSON() {
    return {
      type: ArrayType.TYPE,
      object: this.objectType.name
    };
  }
}

export interface GenerateArrayTypeEvent extends GenerateTypeEvent {
  objectType: ObjectType;
}
export class ArrayTypeFactory extends AbstractObjectTypeFactory<ArrayType, GenerateArrayTypeEvent> {
  constructor() {
    super(ArrayType.TYPE);
  }

  generate(event: GenerateArrayTypeEvent): ArrayType {
    return new ArrayType(event.objectType);
  }
}
