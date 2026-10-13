import { AbstractFormatExpression, ShorthandExpression } from '@ja-platform/evaluator';
import { SchemaModelType } from '@ja-platform/parser-schema';

export interface RelationshipHash {
  [key: string]: RelationshipHash;
}

/**
 * Collect relationships needed by query displays, including related models' displays.
 */
export function getPreloadRelationships(
  type: SchemaModelType,
  columns?: AbstractFormatExpression<any>[] | Record<string, AbstractFormatExpression<any>>
): RelationshipHash {
  const relationships: RelationshipHash = {};
  const displays = columns == null ? [type.displayFormat] : Array.isArray(columns) ? columns : Object.values(columns);
  for (const display of displays) {
    for (const parameter of display?.parameters ?? []) {
      if (parameter instanceof ShorthandExpression) {
        extractRelationshipStructure(type, parameter, relationships, 0);
      }
    }
  }
  return relationships;
}

/**
 * Follow a shorthand path and expand its terminal model's display within the depth limit.
 */
function extractRelationshipStructure(
  type: SchemaModelType,
  expression: ShorthandExpression,
  into: RelationshipHash,
  depth: number
): void {
  for (const field of expression.path) {
    const child = type.getField(String(field));
    if (!(child instanceof SchemaModelType)) return;
    into = into[String(field)] ??= {};
    type = child;
    depth++;
  }
  if (depth > 5) return;
  for (const parameter of type.displayFormat?.parameters ?? []) {
    if (parameter instanceof ShorthandExpression) {
      extractRelationshipStructure(type, parameter, into, depth);
    }
  }
}
