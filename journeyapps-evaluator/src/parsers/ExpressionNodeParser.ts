import {
  Directive,
  AwaitExpression,
  ExpressionStatement,
  isDirective,
  isAwaitExpression,
  isExpressionStatement,
  isLabeledStatement,
  LabeledStatement,
  Node
} from '@babel/types';
import {
  AbstractExpressionParser,
  ExpressionParserFactory,
  ExpressionNodeParseEvent
} from './AbstractExpressionParser';

export type ExpressionType = ExpressionStatement | Directive | LabeledStatement;

export class ExpressionNodeParser extends AbstractExpressionParser<ExpressionType> {
  parse(event: ExpressionNodeParseEvent<ExpressionType>) {
    const { node } = event;
    let expression: Node;
    if (isLabeledStatement(node)) {
      expression = node.body;
    } else if (isDirective(node)) {
      expression = node.value;
    } else if (isAwaitExpression(node)) {
      expression = (node as AwaitExpression).argument;
    } else if (isExpressionStatement(node)) {
      expression = node.expression;
    }
    expression.extra = { ...expression.extra, parent: node };
    return event.parseNode({ ...event, node: expression });
  }
}

export class ExpressionNodeParserFactory extends ExpressionParserFactory<ExpressionNodeParser> {
  constructor() {
    super(['Directive', 'AwaitExpression', 'LabeledStatement', 'ExpressionStatement']);
  }

  getParser() {
    return new ExpressionNodeParser();
  }
}
