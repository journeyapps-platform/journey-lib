import { MemberExpression, isIdentifier } from '@babel/types';
import { FunctionExpressionContext } from '../context/FunctionExpressionContext';
import {
  FormatShorthandTokenExpression,
  FunctionTokenExpression,
  ShorthandTokenExpression,
  ShorthandTokenExpressionOptions,
  TokenExpression
} from '../token-expressions';
import {
  AbstractExpressionParser,
  ExpressionParserFactory,
  ExpressionNodeParseEvent
} from './AbstractExpressionParser';

export type MemberExpressionParsedType =
  | FunctionTokenExpression
  | ShorthandTokenExpression
  | FormatShorthandTokenExpression;

/**
 * Parses member expressions like:
 *
 * object.property1
 * object[param].property2
 * object['property1'].property2
 */
export class MemberExpressionParser extends AbstractExpressionParser<MemberExpression, MemberExpressionParsedType> {
  parse(event: ExpressionNodeParseEvent<MemberExpression>) {
    const { node, source, context } = event;
    const expr = source.slice(node.start, node.end);

    const { objectName, properties } = MemberExpressionParser.parseMember(event);

    const options: ShorthandTokenExpressionOptions = {
      expression: expr,
      name: objectName,
      properties: properties
    };

    if (FunctionExpressionContext.isInstanceOf(context)) {
      return new ShorthandTokenExpression({ ...options, isFunction: true });
    }

    const format: string = node.extra?.format as string;
    return format == null
      ? new ShorthandTokenExpression(options)
      : new FormatShorthandTokenExpression({ ...options, format: format });
  }

  static parseMember(
    event: ExpressionNodeParseEvent<MemberExpression>,
    properties: TokenExpression[] = []
  ): {
    objectName: string;
    properties: TokenExpression[];
  } {
    const { node, source, parseNode } = event;
    if (isIdentifier(node.object)) {
      const propertyExpr = parseNode({
        node: node.property,
        source: source.slice(node.property.start, node.property.end)
      });
      propertyExpr.options.isComputed = node.computed;
      properties.push(propertyExpr);
      return {
        objectName: node.object.name,
        properties: properties
      };
    }

    const result = MemberExpressionParser.parseMember({ ...event, node: node.object as MemberExpression }, properties);
    const propertyExpr = parseNode({
      node: node.property,
      source: source.slice(node.property.start, node.property.end)
    });
    propertyExpr.options.isComputed = node.computed;
    result.properties.push(propertyExpr);
    return result;
  }
}

export class MemberExpressionParserFactory extends ExpressionParserFactory<MemberExpressionParser> {
  constructor() {
    super('MemberExpression');
  }
  getParser() {
    return new MemberExpressionParser();
  }
}
