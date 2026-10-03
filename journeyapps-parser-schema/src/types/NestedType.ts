import { TypeInterface } from '@ja-platform/evaluator';
import { Schema } from '../schema/Schema';
import { parseJsonVariable } from '../schema/schemaParser';
import { Type } from './Type';

export class NestedType extends Type {
  static TYPE = 'scope';

  static isInstanceOf(type: TypeInterface) {
    return type.name === NestedType.TYPE;
  }

  static fromJSON(schema: Schema, parent: Type, data: any) {
    const type = new NestedType(parent);
    for (let name in data) {
      // Include parent keys
      const varData = data[name];
      const variable = parseJsonVariable(schema, name, varData);
      type.addAttribute(variable);
    }
    return type;
  }

  constructor(public parent: Type) {
    super(NestedType.TYPE);

    if (this.parent) {
      this.attributes = Object.create(parent.attributes);
    }
  }

  toJSON() {
    let result: { [index: string]: any } = {};
    for (let key in this.attributes) {
      // Don't include parent keys
      if (this.attributes.hasOwnProperty(key)) {
        result[key] = this.attributes[key].toJSON();
      }
    }
    return result;
  }
}
