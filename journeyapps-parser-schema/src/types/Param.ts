import { FunctionExpression } from '@ja-platform/evaluator';
import { AbstractObjectTypeFactory } from '../schema/TypeFactory';
import { Type } from '@ja-platform/types';
import { GenerateVariableEvent, Variable, VariableJsonType } from './Variable';

export class Param<T extends Type = Type> extends Variable<T> {
  static TYPE = 'parameter';

  static isInstanceOf(obj: any): obj is Param {
    return obj instanceof Param || obj?.TYPE == Param.TYPE;
  }

  required?: boolean;
  provideValue?: FunctionExpression;

  toJSON(): VariableJsonType {
    const result = super.toJSON();
    if (this.required != null) {
      result.required = this.required;
    }
    if (this.provideValue != null) {
      result.provideValue = this.provideValue.raw();
    }
    return result;
  }
}

export interface GenerateParamEvent<T extends Type> extends GenerateVariableEvent<T> {
  required?: boolean;
  provideValue?: FunctionExpression;
}

export class ParamFactory<T extends Type = Type> extends AbstractObjectTypeFactory<Param<T>, GenerateParamEvent<T>> {
  constructor() {
    super(Param.TYPE);
  }

  generate<T extends Type = Type>(event: GenerateParamEvent<T>): Param<T> {
    const param = new Param<T>(event.name, event.type);
    param.required = event.required;
    param.provideValue = event.provideValue;
    return param;
  }
}
