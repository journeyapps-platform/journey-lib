import { ExpressionSource } from './tokens';
import { AbstractExpression } from './expressions/AbstractExpression';

/**
 * Return null for unrecognized syntax; throw for malformed input belonging to this parser.
 */
export interface ExpressionParser<T extends AbstractExpression = AbstractExpression> {
  tryParse(source: ExpressionSource, start?: number): T | null;
}
