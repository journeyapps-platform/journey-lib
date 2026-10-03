import { TypeInterface } from '@ja-platform/evaluator';
import { AbstractObjectTypeFactory } from '../schema/TypeFactory';
import { Type } from './Type';
import { GenerateVariableEvent, Variable, VariableJsonType } from './Variable';

export class Param<T extends Type | TypeInterface = Type> extends Variable<T> {
  static TYPE = 'parameter';

  static isInstanceOf(obj: any): obj is Param {
    return obj instanceof Param || obj?.TYPE == Param.TYPE;
  }

  required?: boolean;
  provideValue?: string;

  toJSON(): VariableJsonType {
    const result = super.toJSON();
    if (this.required != null) {
      result.required = this.required;
    }
    if (this.provideValue != null) {
      result.provideValue = this.provideValue;
    }
    return result;
  }
}

export interface GenerateParamEvent<T extends TypeInterface> extends GenerateVariableEvent<T> {
  required?: boolean;
  provideValue?: string;
}

export class ParamFactory<T extends TypeInterface = Type> extends AbstractObjectTypeFactory<
  Param<T>,
  GenerateParamEvent<T>
> {
  constructor() {
    super(Param.TYPE);
  }

  generate<T extends TypeInterface = Type>(event: GenerateParamEvent<T>): Param<T> {
    const param = new Param<T>(event.name, event.type);
    param.required = event.required;
    param.provideValue = event.provideValue;
    return param;
  }
}
