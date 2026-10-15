import { CombinedParser } from './CombinedParser';
import { parseExpression } from './utils/parserUtils';
import { FormatStringExpression } from './expressions/text/FormatStringExpression';
import { FunctionExpressionParser, EvaluatedExpressionParser, AbstractExpression } from './expressions';

export { formatValue } from './utils/formatStringUtils';

/**
 * Create format string.
 */
export function formatString(expression: string): FormatStringExpression | null {
  if (expression == null) {
    return null;
  } else {
    return FormatStringExpression.parse(expression);
  }
}

/**
 * Construct an explicitly evaluated expression, including function calls.
 */
export function functionExpression(expression: string): AbstractExpression | null {
  if (expression == null) {
    return null;
  }
  return new CombinedParser([new FunctionExpressionParser(), new EvaluatedExpressionParser()]).tryParse(expression);
}

/**
 * Create a expression that can be evaluated.
 */
export function actionableExpression(expression: string): AbstractExpression | null {
  if (expression == null) {
    return null;
  }
  return parseExpression(expression);
}
