import {
  DirectiveLiteral,
  isDirectiveLiteral,
  isStringLiteral,
  isNullLiteral,
  isTemplateLiteral,
  Literal
} from '@babel/types';
import { FormatStringContext } from '../context/FormatStringContext';
import { FunctionExpressionContext } from '../context/FunctionExpressionContext';

import {
  ConstantTokenExpression,
  FunctionTokenExpression,
  PrimitiveConstantTokenExpression
} from '../token-expressions';
import {
  AbstractExpressionParser,
  ExpressionParserFactory,
  ExpressionNodeParseEvent
} from './AbstractExpressionParser';

export type LiteralExpression = Literal | DirectiveLiteral;

export type ParsedLiteralExpressionType =
  | ConstantTokenExpression
  | FunctionTokenExpression
  | PrimitiveConstantTokenExpression;

export class LiteralExpressionParser extends AbstractExpressionParser<LiteralExpression, ParsedLiteralExpressionType> {
  parse(event: ExpressionNodeParseEvent<LiteralExpression>) {
    const { node, context, source } = event;
    const inFunctionContext = FunctionExpressionContext.isInstanceOf(context);
    if (isStringLiteral(node) || isDirectiveLiteral(node)) {
      if (inFunctionContext) {
        return new FunctionTokenExpression({ expression: `'${node.value}'` });
      }
      return new ConstantTokenExpression({ expression: node.value });
    }
    if (isNullLiteral(node)) {
      if (inFunctionContext) {
        return new FunctionTokenExpression({ expression: 'null' });
      }
      return new PrimitiveConstantTokenExpression({ expression: null, isNullLiteral: true });
    }
    if ('value' in node) {
      if (inFunctionContext) {
        return new FunctionTokenExpression({ expression: `${node.value}` });
      }
      return new PrimitiveConstantTokenExpression({ expression: node.value });
    }
    if (isTemplateLiteral(node)) {
      return new FunctionTokenExpression({ expression: source.slice(node.start, node.end) });
    }
    // Fallback to FunctionTokenExpression, until we have a better way to handle this
    return new FunctionTokenExpression({ expression: source.slice(node.start, node.end) });
  }
}

export class LiteralExpressionParserFactory extends ExpressionParserFactory<LiteralExpressionParser> {
  constructor() {
    super(['Literal', 'StringLiteral', 'TemplateLiteral', 'DirectiveLiteral', 'NullLiteral']);
  }

  getParser() {
    return new LiteralExpressionParser();
  }
}
