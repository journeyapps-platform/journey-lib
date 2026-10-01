import { ExpressionParser } from './ExpressionParser';
import { AbstractExpression } from './expressions/AbstractExpression';
import { ExpressionSource } from './tokens';

/**
 * Try parsers in order and stop at the first matching expression.
 */
export class CombinedParser<T extends AbstractExpression = AbstractExpression> implements ExpressionParser<T> {
  readonly parsers: readonly ExpressionParser<T>[];

  constructor(parsers: readonly ExpressionParser<T>[]) {
    this.parsers = Object.freeze([...parsers]);
  }

  tryParse(source: ExpressionSource, start = 0): T | null {
    let expression: T | null = null;
    let index = 0;
    while (expression === null && index < this.parsers.length) {
      expression = this.parsers[index].tryParse(source, start);
      index++;
    }
    return expression;
  }
}
