import { MemberExpression, isIdentifier, isMemberExpression, isCallExpression } from '@babel/types';
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
      return new FunctionTokenExpression(options);
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

    const propertyExpr = parseNode({
      node: node.property,
      source: source.slice(node.property.start, node.property.end)
    });
    propertyExpr.options.isComputed = node.computed;
    // push to front of array
    properties.unshift(propertyExpr);

    if (isMemberExpression(node.object)) {
      return MemberExpressionParser.parseMember(
        {
          ...event,
          node: node.object
        },
        properties
      );
    }

    const objectExpr = parseNode({ node: node.object, source: source.slice(0, node.object.end) });

    return {
      objectName: objectExpr.stringify(),
      properties: properties
    };
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
