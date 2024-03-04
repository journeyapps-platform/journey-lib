import { TokenExpression } from './token-expressions/TokenExpression';
import { extract, formatValue } from './tools';
import { AttributeValidationError } from '@journeyapps/core-xml';
import { TypeInterface } from './TypeInterface';
import { FormatStringScope } from './FormatStringScope';
import { FunctionTokenExpression } from './token-expressions/FunctionTokenExpression';
import { ConstantTokenExpression } from './token-expressions/ConstantTokenExpression';
import { ShorthandTokenExpression } from './token-expressions/ShorthandTokenExpression';
import { FormatShorthandTokenExpression } from './token-expressions/FormatShorthandTokenExpression';

/**
 * Construct a new format string expression.
 */
export class FormatString {
  static TYPE = 'format-string';
  type: string;
  expression: string;
  tokens: TokenExpression[];

  constructor(expression: string) {
    this.expression = expression || '';
    this.tokens = FormatString.compile(this.expression);
    this.type = FormatString.TYPE;
  }

  static isInstanceOf(val: any): val is FormatString {
    return val?.type === FormatString.TYPE;
  }

  /**
   * Compile a format string expression into tokens.
   */
  static compile(format: string): TokenExpression[] {
    let start = 0;

    let tokens: TokenExpression[] = [];

    let len = format.length;
    while (true) {
      const i = format.indexOf('{', start);
      if (i < 0 || i == len - 1) {
        // end of string - everything is normal text
        tokens.push(new ConstantTokenExpression(FormatString.unescape(format.substring(start)), start));
        break;
      }
      // normal text in the gaps between curly braces
      tokens.push(new ConstantTokenExpression(FormatString.unescape(format.substring(start, i)), start));
      if (format[i + 1] == '{') {
        // Double left brace - escape and continue
        tokens.push(new ConstantTokenExpression('{', start));
        start = i + 2;
        continue;
      }

      const parsedBraces = FormatString.parseEnclosingBraces(format.substring(i));
      if (!parsedBraces) {
        // Brace pair faulty (no closing brace), return as a constant
        tokens.push(new ConstantTokenExpression(format.substring(i), start));
        break;
      }

      // Next start is at the end of the currently parsed brace pair
      start = i + parsedBraces.length + 1;

      // `spec` is everything between the curly braces "{" and "}".
      const spec = format.substring(i + 1, i + parsedBraces.length);

      // test for function token prefix
      if (spec.trim().indexOf(FunctionTokenExpression.PREFIX) === 0) {
        // function token because the function name has "$:" as prefix (leading whitespace is ignored)
        tokens.push(new FunctionTokenExpression(spec, i));
      } else {
        // shorthand token
        const colon = spec.indexOf(':');
        if (colon == -1) {
          tokens.push(new ShorthandTokenExpression(spec, i));
        } else {
          tokens.push(new FormatShorthandTokenExpression(spec.substring(0, colon), spec.substring(colon + 1), i));
        }
      }
    }

    // concatenate any neighbouring constant token expressions
    let result: TokenExpression[] = [];
    let last: ConstantTokenExpression = null;
    for (var j = 0; j < tokens.length; j++) {
      var token = tokens[j];
      if (token instanceof ConstantTokenExpression) {
        if (last == null) {
          if (token.expression.length > 0) {
            last = token;
          }
        } else {
          last = last.concat(token);
        }
      } else {
        if (last != null) {
          result.push(last);
          last = null;
        }
        result.push(token);
      }
    }
    if (last != null) {
      result.push(last);
    }

    return result;
  }

  toString(): string {
    return this.expression;
  }

  /**
   * If the format string is constant (i.e. no values need to be evaluated).
   */
  isConstant(): boolean {
    // constants format strings will only contain a single constant token
    return this.tokens.length == 1 && this.tokens[0].isConstant();
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

    var result = into || {};

    var tokens = this.tokens;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (token.isShorthand()) {
        var expression = token.expression;
        extract(type, expression, result, depth);
      }
    }
    return result;
  }

  validate(scopeType: TypeInterface): AttributeValidationError[] {
    var tokens = this.tokens;

    var results: AttributeValidationError[] = [];

    for (var i = 0; i < tokens.length; i++) {
      // validate all shorthand and function token expressions (ignore constant token expressions)
      var token = tokens[i];
      var expression = token.expression;
      if (token.isShorthand()) {
        var warnQuestionMark = false;
        if (expression.length > 0 && expression[0] == '?') {
          expression = expression.substring(1);
          warnQuestionMark = true;
        }

        var type = scopeType.getType(expression);
        if (type == null) {
          results.push({
            start: token.start + 1,
            end: token.start + 1 + token.expression.length,
            type: 'error',
            message: "'" + token.expression + "' is not defined"
          });
        } else if (warnQuestionMark) {
          results.push({
            start: token.start + 1,
            end: token.start + 2,
            type: 'warning',
            message: 'Usage of ? in expressions is deprecated.'
          });
        }
      }
      if (token.isFunction()) {
        // TODO: validate that function exists in view
      }
    }
    return results;
  }

  validateAndReturnRecordings(scopeType: TypeInterface) {
    var tokens = this.tokens;
    var recordings: {
      type: string;
      isPrimitiveType: boolean;
      name: string;
    }[][] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.isConstant()) {
        const expression = token.expression;
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

  getConstantValue(): any {
    if (!this.isConstant()) {
      throw new Error('Not constant!');
    }
    return this.tokens[0].valueOf();
  }

  // This helps speed up dirty-checking.
  // With this, we can use "by reference" checking in watches.
  valueOf() {
    return this.expression;
  }

  evaluatePromise(scope: FormatStringScope): Promise<string> {
    const tokens = this.tokens;
    let promises = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.isConstant()) {
        // Constant tokens are skipped here (nothing to evaluate).
      } else {
        const promise = token.tokenEvaluatePromise(scope);
        promises.push(promise);
      }
    }

    return Promise.all(promises).then(function (results) {
      let result = '';
      let promiseIndex = 0;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.isConstant()) {
          result += token.valueOf();
        } else {
          result += results[promiseIndex];
          promiseIndex += 1;
        }
      }
      return result;
    });
  }

  /**
   * If not all values are loaded yet, null is returned.
   */
  evaluate(scope: FormatStringScope): string {
    const tokens = this.tokens;

    let result = '';
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.isConstant()) {
        result += token.valueOf();
      } else if (token.isFunction()) {
        // Not supported - return the original expression
        result += (token as FunctionTokenExpression).toConstant(true).valueOf();
      } else {
        let expression = token.expression;
        if (expression.length > 0 && expression[0] == '?') {
          expression = expression.substring(1);
        }
        const value = scope.getValue(expression);
        if (value === undefined) {
          // Still loading
          return null;
        } else {
          const type = scope.getExpressionType(expression);
          const text = formatValue(value, type, token.format);
          result += text;
        }
      }
    }
    return result;
  }

  static parseEnclosingBraces(format: string) {
    const i = format.indexOf('{');
    if (i === -1) {
      return null;
    }
    // We want to skip through these sections
    // i.e. do not match { in a string, e.g. "{"
    const SPECIAL_SECTIONS = ["'", '"'];

    for (let k = i + 1; k < format.length; k++) {
      const character = format[k];

      if (SPECIAL_SECTIONS.indexOf(character) !== -1) {
        // This is the start of a string, jump to its end
        const endChar = format.indexOf(character, k + 1);
        if (endChar === -1) {
          // Unless the end doesn't exist. Error out.
          return null;
        }
        k = endChar;
        continue;
      }

      if (character === '{') {
        // Start of a pair of inner braces,
        // recursively parse them
        const inner = FormatString.parseEnclosingBraces(format.substring(k));
        if (!inner) {
          // Faulty inner, return null
          return null;
        }
        k += inner.length;
        continue;
      }

      if (character === '}') {
        // Found closing part for current level of braces
        // Return the length to the caller
        return { length: k - i };
      }
    }
    // Came to end of loop without a match. Faulty, return null
    return null;
  }

  static unescape(s: string) {
    let start = 0;
    let result = '';
    const len = s.length;
    while (true) {
      const i = s.indexOf('}', start);
      if (i == -1 || i == len - 1) {
        result += s.substring(start);
        break;
      }
      result += s.substring(start, i + 1);
      // We assume that the character at i+1 is another right brace, but we don't do any checking.
      start = i + 2;
    }
    return result;
  }
}

// Expose internal functions for tests
export const _compile = FormatString.compile;
export const parseEnclosingBraces = FormatString.parseEnclosingBraces;
