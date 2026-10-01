import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { CallExpression } from '@babel/types';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { EvaluatedExpression, EvaluatedExpressionParser } from '../EvaluatedExpression';
import { ExpressionSource, JSToken } from '../../tokens';

/**
 * Journey's explicitly prefixed JavaScript function call.
 */
export class FunctionExpression extends EvaluatedExpression {
  static TYPE = 'function-expression';

  static parse(source: ExpressionSource, start = 0): FunctionExpression {
    return requireExpression(new FunctionExpressionParser(), source, start);
  }
  constructor(options: AbstractExpressionOptions) {
    super(options);
    this.type = FunctionExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && this.tokens.some((token) => token instanceof JSToken && token.isCallExpression());
  }

  /**
   * JavaScript call helpers operate on the JS token, while the evaluated-expression base stays language-neutral.
   */
  get js(): JSToken {
    return this.codeToken as JSToken;
  }
  get arguments(): CallExpression['arguments'] {
    return this.js.arguments;
  }
  functionName(): string {
    return this.js.functionName();
  }

  withName(name: string): this {
    return this.withCode(this.js.withName(name));
  }
  withArguments(args: readonly AbstractExpression[]): this {
    const argumentsSource = args.map((argument) => {
      let source: string;
      if (argument instanceof EvaluatedExpression) {
        source = argument.text();
      } else {
        source = argument.stringify();
      }
      return source;
    });
    return this.withArgumentSources(argumentsSource);
  }

  withArgumentSources(args: readonly string[]): this {
    return this.withCode(this.js.withArguments(args));
  }
}

/**
 * Recognize the syntax owned by FunctionExpression.
 */
export class FunctionExpressionParser implements ExpressionParser<FunctionExpression> {
  tryParse(source: ExpressionSource, start = 0): FunctionExpression | null {
    const evaluated = new EvaluatedExpressionParser().tryParse(source, start);
    let expression: FunctionExpression | null = null;
    if (evaluated) {
      const candidate = new FunctionExpression({ ...evaluated.options, tokens: evaluated.tokens });
      if (candidate.isValid()) {
        expression = candidate;
      }
    }
    return expression;
  }
}
