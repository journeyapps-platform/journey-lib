import { EnumOption } from '../EnumOption';
import { Type } from '@ja-platform/types';

export interface ChoiceTypeConfig {
  multiple: boolean;
}

/**
 * Add schema option labels without replacing the underlying value type.
 */
export function withChoices<TBase extends new (...args: any[]) => Type>(Base: TBase) {
  return class extends Base {
    options: Record<string, EnumOption> = {};
    multipleOptions = false;
    hasOptions = false;

    format(value: any): string {
      if (!this.multipleOptions) {
        return this.options[value]?.label ?? '< invalid value >';
      }
      if (value == null || value.length === 0) return '';
      const values: any[] = Array.prototype.slice.call(value);
      values.sort((a, b) => {
        const left = this.options[a];
        const right = this.options[b];
        return left == null || right == null ? 0 : left.index - right.index;
      });
      return values.map((item) => this.options[item]?.label ?? '< invalid value >').join(', ');
    }

    addOption(value: any, label: string, index: number): EnumOption {
      if (value in this.options) {
        throw new Error("key '" + value + "' is already used");
      }
      this.options[value] = new EnumOption(value, label, index);
      this.hasOptions = true;
      return this.options[value];
    }

    values(obj: any) {
      return Object.keys(obj).map((key) => {
        return obj[key].toJSON();
      });
    }

    toJSON(): any {
      return {
        ...super.toJSON(),
        options: Object.keys(this.options).map((key) => {
          return this.options[key].toJSON();
        })
      };
    }
  };
}

export abstract class ChoiceType extends withChoices(Type) {
  static isInstanceOf(type: Type | null): type is ChoiceType {
    return type != null && 'options' in type && 'addOption' in type;
  }

  constructor(name: string, config?: ChoiceTypeConfig) {
    super(name);
    this.multipleOptions = config?.multiple ?? false;
  }
}
