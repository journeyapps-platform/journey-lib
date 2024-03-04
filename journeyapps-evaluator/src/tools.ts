import { FunctionTokenExpression } from './token-expressions/FunctionTokenExpression';
import { ShorthandTokenExpression } from './token-expressions/ShorthandTokenExpression';
import { FormatShorthandTokenExpression } from './token-expressions/FormatShorthandTokenExpression';
import { FormatString } from './FormatString';
import { TypeInterface } from './TypeInterface';
import { LegacyFunctionTokenExpression } from './token-expressions/LegacyFunctionTokenExpression';

export function getObjectType(parent: any, name: string) {
  var variable = parent.getAttribute(name);

  if (variable != null) {
    var type = variable.type;
    if (type.isObject) {
      return type;
    }
  }
  return null;
}

// Merge hashes of hashes (no non-hash values)
// Sample:
//   deepMerge({a: {}}, {b: {}}) => {a: {}, b: {}}
//   deepMerge({a: {b: {c: {}}}, d: {}}, {a: {e: {}}}) => {a: {b: {c: {}}, e: {}}, d: {}}
export function deepMerge(a: any, b: any) {
  if (typeof a != 'object' || typeof b != 'object') {
    throw new Error('Parameters must be objects only');
  }
  Object.keys(b).forEach(function (key) {
    if (!(key in a)) {
      // There are no actual "values" here, except for more nested hashes.
      // The presence of keys is the important part.
      a[key] = {};
    }
    deepMerge(a[key], b[key]);
  });
  return a;
}

export function extract(type: any, expression: string, into: any, depth: number) {
  var dot = expression.indexOf('.');
  if (dot < 0) {
    var objectType = getObjectType(type, expression);
    if (objectType == null) {
      // Not an object - don't continue
    } else {
      var b: any = {};
      b[expression] = objectType.displayFormat.extractRelationshipStructure(objectType, depth + 1);
      deepMerge(into, b);
    }
  } else {
    var head = expression.substring(0, dot); // The first part of the expression
    var tail = expression.substring(dot + 1); // The rest of the expression

    var child = getObjectType(type, head);

    if (child == null) {
      // nothing
    } else {
      if (!(head in into)) {
        into[head] = {};
      }
      extract(child, tail, into[head], depth + 1);
    }
  }
}

/**
 * Create format string.
 */
export function formatString(expression: string): FormatString | null {
  if (expression == null) {
    return null;
  } else {
    return new FormatString(expression);
  }
}

/**
 # Construct a function token expression from a raw expression string.
 * @param {string} expression
 * @param {boolean} [allowLegacy=true] if legacy function token expressions are allowed (defaults to true)
 * @return {FunctionTokenExpression|LegacyFunctionTokenExpression|null}
 */
export function functionTokenExpression(expression: string, allowLegacy?: boolean) {
  if (typeof allowLegacy === 'undefined' || allowLegacy == null) {
    allowLegacy = true; // default value
  }
  if (expression == null) {
    return null;
  }
  if (expression.trim().indexOf(FunctionTokenExpression.PREFIX) === 0) {
    return new FunctionTokenExpression(expression);
  }
  if (allowLegacy) {
    // assume legacy function token expression (if allowed) at this point
    return new LegacyFunctionTokenExpression(expression);
  }
  return null;
}

/**
 * Create a token expression that can be evaluated.
 */
export function actionableTokenExpression(
  expression: string
): FunctionTokenExpression | ShorthandTokenExpression | FormatShorthandTokenExpression {
  if (expression == null) {
    return null;
  }
  if (expression.trim().indexOf(FunctionTokenExpression.PREFIX) === 0) {
    return new FunctionTokenExpression(expression);
  }
  var colon = expression.indexOf(':');
  if (colon == -1) {
    return new ShorthandTokenExpression(expression);
  }
  return new FormatShorthandTokenExpression(expression.substring(0, colon), expression.substring(colon + 1));
}

// Format an expression with a specific format.
// Return a promise resolving with the formatted value.
export function formatValue(value: any, type: TypeInterface, format: string): string {
  if (value == null) {
    return '';
  } else if (type != null) {
    return type.format(value, format);
  } else {
    // This should generally not happen. However, we still try to handle it gracefully.
    // This is useful for tests where we don't want to define the type for every variable.
    return value.toString();
  }
}

export async function formatValueAsync(value: any, type: TypeInterface, format: string): Promise<string> {
  if (value != null && typeof value._display == 'function') {
    // Object - recursive promise-based formatting.
    return value._display() as Promise<string>;
  } else {
    return formatValue(value, type, format);
  }
}

// Expose internal functions for tests
export { deepMerge as _deepMerge };
