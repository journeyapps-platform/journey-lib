import { ExpressionParser } from '../ExpressionParser';
import { CombinedParser } from '../CombinedParser';
import {
  AbstractExpression,
  EvaluatedExpressionParser,
  NullExpressionParser,
  PrimitiveConstantExpressionParser,
  TextExpressionParser,
  FormatShorthandExpressionParser,
  FunctionExpressionParser,
  ShorthandExpressionParser
} from '../expressions';
import { ExpressionSource } from '../tokens';

/**
 * The default Journey syntax selection. Callers can compose their own parser order instead.
 */
export function parseExpression(source: ExpressionSource, start = 0): AbstractExpression | null {
  return new CombinedParser<AbstractExpression>([
    new FunctionExpressionParser(),
    new EvaluatedExpressionParser(),
    new NullExpressionParser(),
    new PrimitiveConstantExpressionParser(),
    new TextExpressionParser(true),
    new FormatShorthandExpressionParser(),
    new ShorthandExpressionParser()
  ]).tryParse(source, start);
}

/**
 * Require a match for an expression's parse convenience method.
 */
export function requireExpression<T extends AbstractExpression>(
  parser: ExpressionParser<T>,
  source: ExpressionSource,
  start = 0
): T {
  const expression = parser.tryParse(source, start);
  if (!expression || !expression.isValid()) {
    throw new SyntaxError(`Input does not match ${parser.constructor.name}.`);
  }
  return expression;
}
