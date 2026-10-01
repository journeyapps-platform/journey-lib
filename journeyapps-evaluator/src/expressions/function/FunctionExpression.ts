import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { EvaluatedExpression, EvaluatedExpressionParser } from '../EvaluatedExpression';
import { CodeToken, ExpressionSource } from '../../tokens';

/**
 * An explicitly evaluated function call, such as `$:save(true)` or `$:worker.save(user.name)`.
 * The root code expression must be a call; this type exposes its target and arguments for editing.
 *
 * @example
 * ```ts
 * const expression = FunctionExpression.parse('$:save(true)');
 * expression.functionName(); // 'save'
 * expression.withName('persist').stringify(); // '$:persist(true)'
 * expression.withArgumentSources(['false']).stringify(); // '$:save(false)'
 * ```
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
    return super.isValid() && this.tokens.some((token) => token instanceof CodeToken && token.isCallExpression());
  }

  /**
   * The code token backing this function call.
   */
  get code(): CodeToken {
    return this.codeToken;
  }

  get arguments(): CodeToken['arguments'] {
    return this.code.arguments;
  }

  functionName(): string {
    return this.code.functionName();
  }

  withName(name: string): this {
    return this.withCode(this.code.withName(name));
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
    return this.withCode(this.code.withArguments(args));
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
