import { Schema } from '../schema/Schema';
import { Variable } from './Variable';
import { EnumOption } from './EnumOption';
import { TypeInterface } from '@ja-platform/evaluator';

// Base class for any type (attribute type, object type or view definition).
export class Type implements TypeInterface {
  name: string;
  attributes: { [index: string]: Variable };
  isPrimitiveType: boolean;

  isCollection?: boolean;
  isObject?: boolean;
  isDay?: boolean;

  // TODO: create proper subclasses to represent these
  spec?: string;
  subType?: string;
  /** For attachments */
  media?: string;
  /** For attachments */
  autoDownload?: boolean;

  options: { [key: string]: EnumOption };
  hasOptions?: boolean;
  multipleOptions?: boolean;

  constructor(name: string, isPrimitive?: boolean) {
    this.name = name;
    this.attributes = {}; // Default value
    this.isPrimitiveType = isPrimitive || false;
  }

  // Given a variable, add it as an attribute to this type.
  // Applicable to views, objects and locations.
  addAttribute(attribute: Variable) {
    this.attributes[attribute.name] = attribute;
  }

  getType(expression: string): Type | null {
    const variable = this.getVariable(expression);
    if (variable == null) {
      return null;
    } else {
      return variable.type;
    }
  }

  // Returns an array of [parent, child] variable types
  // The expression should be dot-separated such as `person.name`.
  // NOTE: This only returns the last two parts of the expression
  // e.g. x.y.z will return [(details of y), (details of z)]
  getVariableTypeAndNameWithParent(expression: string) {
    const arrayOfVariables = this.getVariableWithParent(expression);
    if (arrayOfVariables == null) {
      return null;
    } else {
      let arrayOfTypes: {
        type: string;
        isPrimitiveType: boolean;
        name: string;
      }[] = [];
      for (var i = 0; i < arrayOfVariables.length; i++) {
        const variable = arrayOfVariables[i];
        if (variable == null) {
          arrayOfTypes.push(null);
        } else {
          arrayOfTypes.push({
            type: variable.type.name,
            isPrimitiveType: variable.type.isPrimitiveType,
            name: variable.name
          });
        }
      }
      return arrayOfTypes;
    }
  }

  // Return a hash of all attributes (including relationships and has_many) on this object.
  // Each value is Variable object.
  getAttributes() {
    return this.attributes;
  }

  getAttribute<T extends Type = Type>(name: string): Variable<T> | null {
    return this.attributes[name] as Variable<T>;
  }

  // Given an expression, return an attribute/variable defined by the expression.
  // The expression should be dot-separated, such as `person` or `person.name`.
  getVariable(expression: string): Variable {
    if (expression == null || expression == 'null') {
      return null;
    }
    const dot = expression.indexOf('.');
    if (dot < 0) {
      return this.getAttribute(expression);
    } else {
      const head = expression.substring(0, dot); // The first part of the expression
      const tail = expression.substring(dot + 1); // The rest of the expression
      const child = this.getAttribute(head);
      if (child == null || child.type == null) {
        return null;
      } else {
        return child.type.getVariable(tail);
      }
    }
  }

  // Given an expression, return an attribute/variable and their parent defined by the expression.
  // The expression should be dot-separated such as `person.name`.
  // This will return an array in the form: [parent, child]
  getVariableWithParent(expression: string) {
    if (expression == null || expression == 'null') {
      return null;
    }
    let arrayOfVariables = [];
    let mainObject: Type = this;

    while (expression.length > 0) {
      const dot = expression.indexOf('.');
      if (dot < 0) {
        arrayOfVariables.push(mainObject.getAttribute(expression));
        // Clear the expression, triggering the end condition of the loop
        // Can probably just break though
        expression = '';
      } else {
        const head = expression.substring(0, dot); // The first part of the expression
        const tail = expression.substring(dot + 1); // The rest of the expression
        const child = mainObject.getAttribute(head);
        if (child && child.type) {
          arrayOfVariables.push(child);
          mainObject = child.type;
        }
        expression = tail;
      }
    }

    // We want [parent, child], i.e. the last two entries of the array:

    if (arrayOfVariables.length == 0) {
      return [null, null];
    }
    if (arrayOfVariables.length == 1) {
      // No parent exists
      return [null, arrayOfVariables[0]];
    }
    const n = arrayOfVariables.length;
    // Return the last two entries
    return arrayOfVariables.slice(n - 2);
  }

  stringify(): string {
    return this.name;
  }

  valueOf() {
    return this.name;
  }

  toJSON(): any {
    return {};
  }

  // Given a value of this type and an optional format specifier, return a string version formatted according to
  // the specifier. Subclasses should override this to implement their specific formatting.
  format(value: any, format?: string): string {
    return value.toString();
  }

  // Implemented elsewhere

  setupVariables(schema: Schema) {
    // no op
  }

  cast(value: any): any {
    throw new Error('Not implemented');
  }

  clone(value: any): any {
    throw new Error('Not implemented');
  }

  valueFromJSON(data: any): any {
    throw new Error('Not implemented');
  }

  valueToJSON(value: any, options?: ValueSerializeOptions): any {
    throw new Error('Not implemented');
  }
}

export interface ValueSerializeOptions {
  inlineAttachments?: boolean;
}
