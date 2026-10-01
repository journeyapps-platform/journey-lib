import { CombinedParser } from './CombinedParser';
import { parseExpression } from './utils/parserUtils';
import { TypeInterface } from './definitions/TypeInterface';
import { FormatStringExpression } from './expressions/text/FormatStringExpression';
import { FunctionExpressionParser, EvaluatedExpressionParser, AbstractExpression } from './expressions';

export { formatValue } from './utils/formatStringUtils';

/**
 * Create format string.
 */
export function formatString(expression: string): FormatStringExpression | null {
  if (expression == null) {
    return null;
  } else {
    return FormatStringExpression.parse(expression);
  }
}

/**
 * Construct an explicitly evaluated expression, including function calls.
 */
export function functionExpression(expression: string): AbstractExpression | null {
  if (expression == null) {
    return null;
  }
  return new CombinedParser([new FunctionExpressionParser(), new EvaluatedExpressionParser()]).tryParse(expression);
}

/**
 * Create a expression that can be evaluated.
 */
export function actionableExpression(expression: string): AbstractExpression | null {
  if (expression == null) {
    return null;
  }
  return parseExpression(expression);
}

export function extract(type: TypeInterface, expression: string, into: any, depth: number) {
  const dot = expression.indexOf('.');
  if (dot < 0) {
    const objectType = getObjectType(type, expression);
    if (objectType == null) {
      // Not an object - don't continue
    } else {
      const b: any = {};
      b[expression] = objectType.displayFormat.extractRelationshipStructure(objectType, depth + 1);
      deepMerge(into, b);
    }
  } else {
    const head = expression.substring(0, dot); // The first part of the expression
    const tail = expression.substring(dot + 1); // The rest of the expression

    const child = getObjectType(type, head);

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

export function getObjectType(parent: any, name: string) {
  const variable = parent.getAttribute(name);

  if (variable != null) {
    const type = variable.type;
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
