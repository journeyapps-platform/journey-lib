import { formatValue } from '@ja-platform/evaluator';
import type { ReferencePath } from '@ja-platform/evaluator';
import type { SchemaObjectDisplayExpression } from '@ja-platform/parser-schema';
import { Type } from '@ja-platform/types';
import type { Formatter } from '@ja-platform/types';
import { DatabaseObject } from './DatabaseObject';

export class ObjectDisplayScope {
  static getValue(object: unknown, expression: string | ReferencePath, depth?: number): any {
    return ObjectDisplayScope.retrieveValue(object, expression, depth, false);
  }

  static async getValuePromise(object: unknown, expression: string | ReferencePath, depth: number = 0): Promise<any> {
    return ObjectDisplayScope.retrieveValue(object, expression, depth, true);
  }

  static retrieveValue(
    object: unknown,
    expression: string | readonly (string | number)[],
    depth: number,
    isPromise: boolean
  ): any {
    if (expression == 'null' || expression == null) {
      return null;
    }
    if (expression == 'true') {
      return true;
    }
    if (expression == 'false') {
      return false;
    }
    if (object == null) {
      return null;
    }

    if (typeof expression !== 'string') {
      const [head, ...tail] = expression;
      const key = String(head);
      if (isPromise) {
        return ObjectDisplayScope.promise(object, key).then((child) =>
          tail.length === 0 ? child : ObjectDisplayScope.retrieveValue(child, tail, depth + 1, true)
        );
      }
      const child = ObjectDisplayScope.cached(object, key);
      return tail.length === 0 || child === undefined
        ? child
        : ObjectDisplayScope.retrieveValue(child, tail, depth + 1, false);
    }

    const dot = expression.indexOf('.');
    if (dot < 0) {
      return isPromise ? ObjectDisplayScope.promise(object, expression) : ObjectDisplayScope.cached(object, expression);
    }
    const head = expression.substring(0, dot); // The first part of the expression
    const tail = expression.substring(dot + 1); // The rest of the expression

    if (isPromise) {
      return ObjectDisplayScope.promise(object, head).then((child) => {
        return ObjectDisplayScope.retrieveValue(child, tail, depth + 1, isPromise);
      });
    }

    const child = ObjectDisplayScope.cached(object, head);
    if (child === undefined) {
      return undefined;
    }
    return ObjectDisplayScope.retrieveValue(child, tail, depth + 1, isPromise);
  }

  static async promise(object: unknown, name: string): Promise<unknown> {
    if (object instanceof DatabaseObject) {
      return object._get(name);
    }
    return (object as Record<string, unknown>)[name];
  }

  static cached(object: unknown, name: string): unknown {
    if (object instanceof DatabaseObject) {
      return object._cached(name);
    } else {
      const val = (object as Record<string, unknown>)[name];
      if (val === undefined) {
        return null;
      } else {
        return val;
      }
    }
  }

  constructor(readonly object: unknown, private readonly formatterFor?: (type: Type) => Formatter) {}

  /**
   * Render available fields, returning null while a referenced value is loading.
   */
  evaluate(expression: SchemaObjectDisplayExpression): string | null {
    const values: unknown[] = [];
    for (const parameter of expression.parameters) {
      const value = this.getValue(parameter.path);
      if (value === undefined) return null;
      values.push(formatValue(value, this.getExpressionFormatter(parameter.path), parameter.format));
    }
    return expression.render(values);
  }

  getExpressionFormatter(path: ReferencePath): Formatter | null {
    const type = this.getExpressionType(path);
    return type == null ? null : this.formatterFor?.(type) ?? type;
  }

  getExpressionType(path: ReferencePath): Type | null {
    let object = this.object;
    for (const property of path.slice(0, -1)) {
      if (object == null) return null;
      object = ObjectDisplayScope.cached(object, String(property));
    }
    return object instanceof DatabaseObject ? object.type.getField(String(path[path.length - 1])) : null;
  }

  getValue(expression: string | ReferencePath) {
    if (typeof expression === 'string' && expression.length > 0 && expression[0] == '?') {
      expression = expression.substring(1);
    }
    return ObjectDisplayScope.getValue(this.object, expression);
  }

  getValuePromise(expression: string | ReferencePath): Promise<any> {
    return ObjectDisplayScope.getValuePromise(this.object, expression);
  }
}
