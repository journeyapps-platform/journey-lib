import { placeholderEnd, formatValue } from '../../utils/formatStringUtils';
import { ExpressionParser } from '../../ExpressionParser';
import { parseExpression } from '../../utils/parserUtils';
import { AttributeValidationError } from '@ja-platform/core-xml';
import { AbstractToken, JSToken, ExpressionSource, TextToken, PlaceholderToken, stringify } from '../../tokens';
import { FormatStringScope } from '../../definitions/FormatStringScope';
import { TypeInterface } from '../../definitions/TypeInterface';
import { AbstractExpression, AbstractExpressionOptions } from '../AbstractExpression';
import { ConstantExpression } from '../constant/ConstantExpression';
import { EvaluatedExpression } from '../EvaluatedExpression';
import { ShorthandExpression } from '../shorthand/ShorthandExpression';
import { extract } from '../../tools';

/**
 * Text interleaved with placeholder expressions, such as `Hello {user.name}`
 * or `Hello {user.name}, {$:getGreeting(true)}`. Plain text is also a valid format string.
 * tokens preserves the complete source; parameters exposes the expressions inside placeholders.
 * Doubled braces represent literal braces when rendered, for example `{{name}}` renders as `{name}`.
 *
 * @example
 * ```ts
 * const expression = FormatStringExpression.parse('Hello {user.name}, {$:getGreeting(true)}');
 * expression.tokens; // TextToken, PlaceholderToken, TextToken, PlaceholderToken
 * expression.parameters; // ShorthandExpression, FunctionExpression
 * expression.raw(); // 'Hello {user.name}, {$:getGreeting(true)}'
 * ```
 */
export class FormatStringExpression extends AbstractExpression<AbstractExpressionOptions, string> {
  static readonly TYPE = 'format-string';

  static parse(source: ExpressionSource, start = 0): FormatStringExpression {
    return new FormatStringExpressionParser().parse(source, start);
  }

  constructor(options: AbstractExpressionOptions) {
    super(FormatStringExpression.TYPE, options);
  }

  isValid(): boolean {
    return this.tokens.every(
      (token) => token instanceof TextToken || (token instanceof PlaceholderToken && token.expression.isValid())
    );
  }

  get parameters(): readonly AbstractExpression[] {
    return this.tokens
      .filter((token): token is PlaceholderToken => token instanceof PlaceholderToken)
      .map((token) => token.expression);
  }

  withParameters(parameters: readonly AbstractExpression[]): FormatStringExpression {
    if (parameters.length !== this.parameters.length)
      throw new Error('Expected one expression for each format-string placeholder.');
    const tokens: AbstractToken[] = [];
    let index = 0;
    let start = this.start;
    for (const token of this.tokens) {
      let replacement: AbstractToken;
      if (token instanceof PlaceholderToken) {
        const parameter = parameters[index++];
        const expression =
          parameter instanceof ConstantExpression
            ? ConstantExpression.parse(parameter.raw(), parameter.valueType, start + 1)
            : parseExpression(parameter.raw(), start + 1);
        expression.start = start;
        replacement = new PlaceholderToken(expression, start);
      } else {
        replacement = new TextToken(token.raw(), start);
      }
      tokens.push(replacement);
      start = replacement.end;
    }
    return FormatStringExpression.parse(tokens, this.start);
  }

  // Example on an asset:
  // '{room} {room.name} {room.building.name}' => {'room' => {'building' => {}}}
  // This will recursively evaluate format strings where required.
  extractRelationshipStructure(type: TypeInterface, depth?: number, into?: any) {
    if (depth == null) {
      depth = 0;
    } else if (depth > 5) {
      return {};
    }

    const result = into || {};

    const parameters = this.parameters;

    for (let i = 0; i < parameters.length; i++) {
      const parameter = parameters[i];
      if (parameter instanceof ShorthandExpression) {
        const expression = parameter.path;
        extract(type, expression, result, depth);
      }
    }
    return result;
  }

  validate(scopeType: TypeInterface): AttributeValidationError[] {
    const parameters = this.parameters;

    const results: AttributeValidationError[] = [];

    for (let i = 0; i < parameters.length; i++) {
      // validate all shorthand and function expressions (ignore constant expressions)
      const parameter = parameters[i];
      if (parameter instanceof ShorthandExpression) {
        let expression = parameter.path;
        let warnQuestionMark = false;
        if (expression.length > 0 && expression[0] == '?') {
          expression = expression.substring(1);
          warnQuestionMark = true;
        }

        const type = scopeType.getType(expression);
        if (type == null) {
          results.push({
            start: parameter.start + 1,
            end: parameter.start + 1 + parameter.path.length,
            type: 'error',
            message: "'" + parameter.path + "' is not defined"
          });
        } else if (warnQuestionMark) {
          results.push({
            start: parameter.start + 1,
            end: parameter.start + 2,
            type: 'warning',
            message: 'Usage of ? in expressions is deprecated.'
          });
        }
      }
    }
    return results;
  }

  validateAndReturnRecordings(scopeType: TypeInterface) {
    const parameters = this.parameters;
    const recordings: {
      type: string;
      isPrimitiveType: boolean;
      name: string;
    }[][] = [];

    for (let i = 0; i < parameters.length; i++) {
      const parameter = parameters[i];
      if (!(parameter instanceof ConstantExpression)) {
        const expression =
          parameter instanceof ShorthandExpression
            ? parameter.path
            : parameter instanceof EvaluatedExpression
            ? parameter.code()
            : parameter.raw();
        // We are interested in the type and name of the final two variables in the expression
        const arrayOfVariables = scopeType.getVariableTypeAndNameWithParent(expression);
        if (arrayOfVariables[0] == null && scopeType.name != 'view') {
          // This can happen in, e.g., an object table where the attribute is on its own as a property
          arrayOfVariables[0] = {
            // Override to the scopeType
            type: scopeType.name,
            isPrimitiveType: scopeType.isPrimitiveType,
            name: 'n/a'
          };
        }
        recordings.push(arrayOfVariables);
      }
    }
    return recordings;
  }

  async evaluatePromise(scope: FormatStringScope): Promise<string> {
    const values = await Promise.all(this.parameters.map((parameter) => parameter.evaluatePromise(scope)));
    return this.render(values);
  }

  /**
   * Return null while a referenced value is still loading. Prefixed placeholders await asynchronous evaluation.
   */
  evaluate(scope: FormatStringScope): string | null {
    const values: unknown[] = [];
    const parameters = this.parameters;
    let ready = true;
    let index = 0;
    while (ready && index < parameters.length) {
      const parameter = parameters[index];
      if (parameter instanceof ConstantExpression) {
        values.push(parameter.value());
      } else if (parameter instanceof EvaluatedExpression) {
        values.push(new PlaceholderToken(parameter).raw());
      } else if (parameter instanceof ShorthandExpression) {
        const value = scope.getValue(parameter.path);
        if (value === undefined) {
          ready = false;
        } else {
          values.push(formatValue(value, scope.getExpressionType(parameter.path), parameter.format));
        }
      }
      index++;
    }
    let result: string | null = null;
    if (ready) {
      result = this.render(values);
    }
    return result;
  }

  /**
   * Assemble the text using resolved placeholder values in parameter order.
   * This does not parse source or evaluate parameters.
   *
   * @example
   * ```ts
   * FormatStringExpression.parse('Hello {user.name}').render(['Sam']); // 'Hello Sam'
   * ```
   */
  render(values: readonly unknown[]): string {
    let index = 0;
    return this.tokens
      .map((token) => {
        let text: string;
        if (token instanceof TextToken) {
          text = token.decodedText;
        } else {
          text = String(values[index++] ?? '');
        }
        return text;
      })
      .join('');
  }

  toString(): string {
    return this.raw();
  }
}

/**
 * Interpret input as a format string, including literal text without placeholders.
 */
export class FormatStringExpressionParser extends ExpressionParser<FormatStringExpression> {
  tryParse(source: ExpressionSource, start = 0): FormatStringExpression {
    source = source ?? '';
    let tokens: readonly AbstractToken[];
    if (typeof source === 'string') {
      tokens = this.tokens(source, start);
    } else {
      tokens = source;
    }
    const expression = new FormatStringExpression({ start, tokens });
    if (!expression.isValid()) {
      throw new SyntaxError('Expected valid format text and placeholders.');
    }
    return expression;
  }

  tokens(source: string, offset = 0): AbstractToken[] {
    const tokens: AbstractToken[] = [];
    let start = 0;
    for (let i = 0; i < source.length; i++) {
      if (source[i] !== '{') continue;
      // Doubled braces encode literal text, so they never start a placeholder.
      if (source[i + 1] === '{') {
        i++;
        continue;
      }
      let end = placeholderEnd(source, i);
      let expression: AbstractExpression;
      let failure: unknown;
      // A slash can mean division or a regexp after a block. Babel resolves that ambiguity
      // if the boundary scanner's first candidate does not form a complete expression.
      let candidate = end;
      if (candidate < 0) {
        candidate = source.indexOf('}', i + 1);
      }
      for (; candidate >= 0; candidate = source.indexOf('}', candidate + 1)) {
        const text = source.slice(i + 1, candidate);
        if (text.trim() === '') throw new SyntaxError('Expected an expression inside a placeholder.');
        try {
          const parsed = parseExpression(text, offset + i + 1);
          if (!parsed) throw new SyntaxError('Expected an expression inside a placeholder.');
          // A candidate brace at the end of a line comment is part of the comment, not the placeholder.
          if (parsed.tokens.some((token) => token instanceof JSToken && token.hasTrailingLineComment)) continue;
          expression = parsed;
          end = candidate;
          break;
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          failure ??= error;
        }
      }
      if (!expression) {
        // Preserve unmatched opening braces as text, but report errors in a complete placeholder.
        if (end < 0) break;
        throw failure ?? new SyntaxError('Expected a closing placeholder brace.');
      }
      if (i > start) tokens.push(new TextToken(source.slice(start, i), offset + start));
      expression.start = offset + i;
      tokens.push(new PlaceholderToken(expression, offset + i));
      start = end + 1;
      i = end;
    }
    if (start < source.length) tokens.push(new TextToken(source.slice(start), offset + start));
    return tokens;
  }
}
