import { isIdentifier, isObjectProperty, ObjectExpression } from '@babel/types';
import { ObjectTokenExpression } from '../token-expressions';
import {
  AbstractExpressionParser,
  ExpressionNodeParseEvent,
  ExpressionParserFactory
} from './AbstractExpressionParser';

export class ObjectExpressionParser extends AbstractExpressionParser<ObjectExpression, ObjectTokenExpression> {
  parse(event: ExpressionNodeParseEvent<ObjectExpression>): ObjectTokenExpression {
    const { node, source, parseNode } = event;

    const props = {};
    for (const prop of node.properties) {
      if (isObjectProperty(prop) && isIdentifier(prop.key)) {
        props[prop.key.name] = parseNode({ node: prop.value, source });
      }
    }

    return new ObjectTokenExpression({ expression: source.slice(node.start, node.end), properties: props });
  }
}

export class ObjectExpressionParserFactory extends ExpressionParserFactory<ObjectExpressionParser> {
  constructor() {
    super('ObjectExpression');
  }

  getParser() {
    return new ObjectExpressionParser();
  }
}
