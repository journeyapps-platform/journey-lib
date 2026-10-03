import { ExpressionParser } from '../../ExpressionParser';
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
 * expression.withName('persist').raw(); // '$:persist(true)'
 * expression.withArgumentSources(['false']).raw(); // '$:save(false)'
 * ```
 */
export class FunctionExpression extends EvaluatedExpression {
  static TYPE = 'function-expression';

  static parse(source: ExpressionSource, start = 0): FunctionExpression {
    return new FunctionExpressionParser().parse(source, start);
  }

  constructor(options: AbstractExpressionOptions) {
    super(options);
    this.type = FunctionExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && this.tokens.some((token) => token instanceof CodeToken && token.isCallExpression());
  }

  get arguments(): CodeToken['arguments'] {
    return this.codeToken.arguments;
  }

  functionName(): string {
    return this.codeToken.functionName();
  }

  withName(name: string): this {
    return this.withCode(this.codeToken.withName(name));
  }

  /**
   * Replace arguments using expression source in the code token's language.
   * Constant text is inserted verbatim; callers supply any required quoting or escaping.
   */
  withArguments(args: readonly AbstractExpression[]): this {
    const argumentsSource = args.map((argument) => {
      let source: string;
      if (argument instanceof EvaluatedExpression) {
        source = argument.code();
      } else {
        source = argument.raw();
      }
      return source;
    });
    return this.withArgumentSources(argumentsSource);
  }

  withArgumentSources(args: readonly string[]): this {
    return this.withCode(this.codeToken.withArguments(args));
  }
}

/**
 * Recognize the syntax owned by FunctionExpression.
 */
export class FunctionExpressionParser extends ExpressionParser<FunctionExpression> {
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
