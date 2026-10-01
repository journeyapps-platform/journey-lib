import { MultipleChoiceIntegerType as SchemaMultipleChoiceIntegerType } from '@ja-platform/parser-schema';
import { DBMultipleChoiceTypeMixin } from './MultipleChoice';
import { DBTypeMixin } from '../Type';

type GConstructor<T extends SchemaMultipleChoiceIntegerType = SchemaMultipleChoiceIntegerType> = new (
  ...args: any[]
) => T;

export function DBMultipleChoiceIntegerTypeMixin<TBase extends GConstructor>(Base: TBase) {
  return class extends DBTypeMixin(DBMultipleChoiceTypeMixin(Base)) {
    cast(value: any) {
      if (!(value instanceof Array)) {
        throw new Error(value + ' is not an array');
      }

      for (let i = 0; i < value.length; i++) {
        const index = value[i];
        const option = this.options[index];
        if (option == null) {
          throw new Error(index + ' is not a valid option');
        }
      }

      return value;
    }
  };
}

export class MultipleChoiceIntegerType extends DBMultipleChoiceIntegerTypeMixin(SchemaMultipleChoiceIntegerType) {}
