import {
  AbstractFormatExpression,
  AbstractFormatExpressionParser,
  CombinedParser,
  FormatShorthandExpressionParser,
  ShorthandExpression,
  ShorthandExpressionParser
} from '@ja-platform/evaluator';
import type { AbstractFormatExpressionOptions, ExpressionSource } from '@ja-platform/evaluator';

/**
 * Schema object display text containing only references and formatted references.
 */
export class SchemaObjectDisplayExpression extends AbstractFormatExpression<
  SchemaObjectDisplayExpression,
  ShorthandExpression
> {
  static readonly TYPE = 'schema-object-display';

  static parse(source: ExpressionSource, start = 0): SchemaObjectDisplayExpression {
    return new SchemaObjectDisplayExpressionParser().parse(source, start);
  }

  constructor(options: AbstractFormatExpressionOptions<ShorthandExpression>) {
    super(SchemaObjectDisplayExpression.TYPE, options);
  }

  isValid(): boolean {
    return super.isValid() && this.parameters.every((parameter) => parameter instanceof ShorthandExpression);
  }

  protected getParser(): SchemaObjectDisplayExpressionParser {
    return new SchemaObjectDisplayExpressionParser();
  }
}

export class SchemaObjectDisplayExpressionParser extends AbstractFormatExpressionParser<
  SchemaObjectDisplayExpression,
  ShorthandExpression
> {
  private readonly placeholders = new CombinedParser<ShorthandExpression>([
    new FormatShorthandExpressionParser(),
    new ShorthandExpressionParser()
  ]);

  protected parsePlaceholder(source: ExpressionSource, start: number) {
    return this.placeholders.parse(source, start);
  }

  protected createExpression(options: AbstractFormatExpressionOptions<ShorthandExpression>) {
    return new SchemaObjectDisplayExpression(options);
  }
}
