import { CombinedParser } from '../../CombinedParser';
import { ExpressionSource } from '../../tokens';
import { EvaluatedExpression, EvaluatedExpressionParser } from '../EvaluatedExpression';
import { FunctionExpressionParser } from '../function/FunctionExpression';
import { FormatShorthandExpressionParser } from '../shorthand/FormatShorthandExpression';
import { ShorthandExpression, ShorthandExpressionParser } from '../shorthand/ShorthandExpression';
import {
  AbstractFormatExpression,
  AbstractFormatExpressionOptions,
  AbstractFormatExpressionParser
} from './AbstractFormatExpression';

/**
 * Format text supporting references, formatted references, and explicitly evaluated code.
 */
export class FormatStringExpression extends AbstractFormatExpression<
  FormatStringExpression,
  ShorthandExpression | EvaluatedExpression
> {
  static readonly TYPE = 'format-string';

  static parse(source: ExpressionSource, start = 0): FormatStringExpression {
    return new FormatStringExpressionParser().parse(source, start);
  }

  constructor(options: AbstractFormatExpressionOptions<ShorthandExpression | EvaluatedExpression>) {
    super(FormatStringExpression.TYPE, options);
  }

  protected getParser(): FormatStringExpressionParser {
    return new FormatStringExpressionParser();
  }
}

export class FormatStringExpressionParser extends AbstractFormatExpressionParser<
  FormatStringExpression,
  ShorthandExpression | EvaluatedExpression
> {
  private readonly placeholders = new CombinedParser<ShorthandExpression | EvaluatedExpression>([
    new FunctionExpressionParser(),
    new EvaluatedExpressionParser(),
    new FormatShorthandExpressionParser(),
    new ShorthandExpressionParser()
  ]);

  protected parsePlaceholder(source: ExpressionSource, start: number) {
    return this.placeholders.parse(source, start);
  }

  protected createExpression(options: AbstractFormatExpressionOptions<ShorthandExpression | EvaluatedExpression>) {
    return new FormatStringExpression(options);
  }
}
