import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { AbstractToken, ExpressionSource, JSToken, TextToken, javascriptToken } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';
import { formatValueAsync } from '../../utils/formatStringUtils';

export class ShorthandExpression<
  O extends AbstractExpressionOptions = AbstractExpressionOptions
> extends AbstractExpression<O> {
  get js(): JSToken {
    return javascriptToken(this.tokens);
  }

  static TYPE = 'shorthand-expression';
  static parse(source: ExpressionSource, start = 0): ShorthandExpression {
    return requireExpression(new ShorthandExpressionParser(), source, start);
  }
  constructor(options: O) {
    let tokens = options.tokens;
    if (tokens == null) {
      try {
        tokens = [new JSToken(options.expression, options.start ?? 0)];
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
        tokens = [new TextToken(options.expression, options.start ?? 0)];
      }
    }
    super(ShorthandExpression.TYPE, { ...options, tokens });
    const js = tokens.find((token): token is JSToken => token instanceof JSToken);
    if (js) {
      this.expression = js.code;
    }
  }

  isValid(): boolean {
    const javascript = this.tokens.filter((token): token is JSToken => token instanceof JSToken);
    return (
      javascript.length === 1 &&
      ['Identifier', 'MemberExpression', 'OptionalMemberExpression'].includes(javascript[0].ast.type)
    );
  }

  text(): string {
    return this.expression;
  }
  async evaluatePromise(scope: FormatStringScope) {
    const value = await scope.getValuePromise(this.expression);
    return formatValueAsync(value, scope.getExpressionType(this.expression), this.format);
  }
}

/**
 * Recognize the syntax owned by ShorthandExpression.
 */
export class ShorthandExpressionParser implements ExpressionParser<ShorthandExpression> {
  tryParse(source: ExpressionSource, start = 0): ShorthandExpression | null {
    let expression: ShorthandExpression | null = null;
    try {
      let tokens: readonly AbstractToken[];
      if (typeof source === 'string') {
        tokens = [new JSToken(source, start)];
      } else {
        tokens = source;
      }
      const candidate = new ShorthandExpression({ expression: '', tokens });
      if (candidate.isValid()) {
        expression = candidate;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
    return expression;
  }
}
