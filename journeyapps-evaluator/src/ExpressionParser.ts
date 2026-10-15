import { ExpressionSource } from './tokens';
import { AbstractExpression } from './expressions/AbstractExpression';

/**
 * Return null for unrecognized syntax; throw for malformed input belonging to this parser.
 */
export abstract class ExpressionParser<T extends AbstractExpression = AbstractExpression> {
  abstract tryParse(source: ExpressionSource, start?: number): T | null;

  /**
   * Require a valid match, preserving any syntax error from the concrete parser.
   */
  parse(source: ExpressionSource, start = 0): T {
    const expression = this.tryParse(source, start);
    if (!expression || !expression.isValid()) {
      throw new SyntaxError(`Input does not match ${this.constructor.name}.`);
    }
    return expression;
  }
}
