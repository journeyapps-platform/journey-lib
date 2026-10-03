import { CombinedParser } from '../CombinedParser';
import {
  AbstractExpression,
  EvaluatedExpressionParser,
  ConstantExpressionParser,
  FormatShorthandExpressionParser,
  FunctionExpressionParser,
  ShorthandExpressionParser
} from '../expressions';
import { ExpressionSource } from '../tokens';

/**
 * Recognize evaluated code and references before preserving remaining input as constant text.
 * Callers can compose their own parser order instead.
 */
export function parseExpression(source: ExpressionSource, start = 0): AbstractExpression | null {
  return new CombinedParser<AbstractExpression>([
    new FunctionExpressionParser(),
    new EvaluatedExpressionParser(),
    new FormatShorthandExpressionParser(),
    new ShorthandExpressionParser(),
    new ConstantExpressionParser()
  ]).tryParse(source, start);
}
