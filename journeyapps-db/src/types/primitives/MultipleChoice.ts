import { MultipleChoiceType as SchemaMultipleChoiceType } from '@ja-platform/parser-schema';
import { DBTypeMixin } from '../Type';

type GConstructor<T extends SchemaMultipleChoiceType = SchemaMultipleChoiceType> = new (...args: any[]) => T;
export function DBMultipleChoiceTypeMixin<TBase extends GConstructor>(Base: TBase) {
  return class extends DBTypeMixin(Base) {
    DEFAULT_INVALID_VALUE = '< invalid value >';

    format(value: any[]): string {
      // value is an array of integers
      if (value == null || value.length === 0) {
        return '';
      } else {
        // Clone and sort the array, so that the labels are always in the same order.
        // Array.prototype.slice should work on any array-like object
        // Use schema order
        const clone = Array.prototype.slice.call(value, 0);
        clone.sort((a: any, b: any) => {
          const optionA = this.options[a];
          const optionB = this.options[b];
          if (optionA == null || optionB == null) {
            return 0; // safety-check
          }
          return optionA.index - optionB.index;
        });

        let result = '';
        for (let i = 0; i < clone.length; i++) {
          const v = clone[i];
          const option = this.options[v];
          let label = this.DEFAULT_INVALID_VALUE;
          if (option != null) {
            label = option.label;
          }
          result += label;
          if (i < value.length - 1) {
            result += ', ';
          }
        }
        return result;
      }
    }
  };
}

export class MultipleChoiceType extends DBMultipleChoiceTypeMixin(SchemaMultipleChoiceType) {}
