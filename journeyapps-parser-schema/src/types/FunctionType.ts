import { TypeInterface } from '@ja-platform/evaluator';
import { AbstractObjectTypeFactory } from '../schema/TypeFactory';
import { Type } from './Type';
import { Variable } from './Variable';

export class FunctionType extends Type {
  static readonly TYPE = 'function';
  static readonly ARG_TAG = 'arg';

  static isInstanceOf(type: TypeInterface): type is FunctionType {
    return type.name === FunctionType.TYPE;
  }
  arguments: Variable[];

  constructor() {
    super(FunctionType.TYPE);
    this.arguments = [];
  }

  addArgument(argument: Variable) {
    this.arguments.push(argument);
  }
}

export class FunctionTypeFactory extends AbstractObjectTypeFactory<FunctionType> {
  constructor() {
    super(FunctionType.TYPE);
  }

  generate(): FunctionType {
    return new FunctionType();
  }
}
