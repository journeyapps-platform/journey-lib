import { ExpressionParser } from '../ExpressionParser';
import { AbstractExpression, AbstractExpressionOptions } from './AbstractExpression';
import {
  AbstractToken,
  CodeToken,
  codeToken,
  ExpressionSource,
  JSToken,
  PrefixToken,
  TextToken,
  FUNCTION_PREFIX,
  hasFunctionPrefix,
  leadingTrivia
} from '../tokens';
import { FormatStringScope } from '../definitions/FormatStringScope';

/**
 * Code explicitly marked for evaluation by the `$:` prefix.
 * Examples include `$:count + 1`, `$:true`, `$:{name: user.name}` and `$:[1, 2]`.
 * The code token owns the language's syntax tree; the supplied scope executes its code.
 * Prefixed calls are specialized by FunctionExpression when using the combined parser.
 *
 * @example
 * ```ts
 * EvaluatedExpression.parse('$:count + 1').code(); // 'count + 1'
 * EvaluatedExpression.parse('$:{active: true}').raw(); // '$:{active: true}'
 * ```
 */
export class EvaluatedExpression extends AbstractExpression<AbstractExpressionOptions> {
  static TYPE = 'evaluated-expression';

  static parse(source: ExpressionSource, start = 0): EvaluatedExpression {
    return new EvaluatedExpressionParser().parse(source, start);
  }

  constructor(options: AbstractExpressionOptions) {
    super(EvaluatedExpression.TYPE, options);
  }

  isValid(): boolean {
    const prefixes = this.tokens.filter((token) => token instanceof PrefixToken);
    const code = this.tokens.filter((token) => token instanceof CodeToken);
    return (
      prefixes.length === 1 && code.length === 1 && this.tokens.indexOf(prefixes[0]) < this.tokens.indexOf(code[0])
    );
  }

  get codeToken(): CodeToken {
    return codeToken(this.tokens);
  }

  withCode(token: CodeToken): this {
    const original = this.codeToken;
    const Type = this.constructor as new (options: AbstractExpressionOptions) => this;
    return new Type({
      ...this.options,
      tokens: this.tokens.map((current) => {
        let replacement = current;
        if (current === original) {
          replacement = token;
        }
        return replacement;
      })
    });
  }

  /**
   * Executable code without the evaluation prefix or surrounding source trivia.
   */
  code(): string {
    return this.codeToken.code;
  }

  async evaluatePromise(scope: FormatStringScope) {
    return scope.evaluateFunctionExpression(this.code());
  }
}

/**
 * Recognize the syntax owned by EvaluatedExpression.
 */
export class EvaluatedExpressionParser extends ExpressionParser<EvaluatedExpression> {
  tryParse(source: ExpressionSource, start = 0): EvaluatedExpression | null {
    let matches: boolean;
    if (typeof source === 'string') {
      matches = hasFunctionPrefix(source);
    } else {
      matches = source.some((token) => token instanceof PrefixToken);
    }
    let expression: EvaluatedExpression | null = null;
    if (matches) {
      let tokens: readonly AbstractToken[];
      if (typeof source === 'string') {
        tokens = this.sourceTokens(source, start);
      } else {
        tokens = source;
      }
      expression = new EvaluatedExpression({
        tokens
      });
      if (!expression.isValid()) {
        throw new SyntaxError('Expected a prefixed code expression.');
      }
    }
    return expression;
  }

  sourceTokens(source: string, start = 0): readonly AbstractToken[] {
    const trivia = leadingTrivia(source);
    if (!source.slice(trivia.length).startsWith(FUNCTION_PREFIX)) {
      throw new SyntaxError('Expected an evaluation prefix.');
    }
    const tokens: AbstractToken[] = [];
    if (trivia) {
      tokens.push(new TextToken(trivia, start));
    }
    tokens.push(new PrefixToken(start + trivia.length));
    tokens.push(
      new JSToken(source.slice(trivia.length + FUNCTION_PREFIX.length), start + trivia.length + FUNCTION_PREFIX.length)
    );
    return tokens;
  }
}
