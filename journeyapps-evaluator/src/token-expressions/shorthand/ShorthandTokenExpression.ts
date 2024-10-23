import { FormatStringScope } from '../../definitions/FormatStringScope';
import { TypeInterface } from '../../definitions/TypeInterface';
import { formatValue } from '../../tools';
import { TokenExpression, TokenExpressionOptions } from '../TokenExpression';

/**
 * Shorthand token expression.
 *
 * <var name="my_user" type="user">
 *
 * <info value="{my_user.name}" />
 *
 * Above is a shorthand for
 *
 * <info value="{$:view.my_user.name}" />
 */

export interface ShorthandTokenExpressionOptions extends TokenExpressionOptions {
  name?: string;
  properties?: TokenExpression[];
}

export class ShorthandTokenExpression<
  O extends ShorthandTokenExpressionOptions = ShorthandTokenExpressionOptions
> extends TokenExpression<O> {
  static TYPE = 'shorthand-expression';
  constructor(options: O) {
    super(ShorthandTokenExpression.TYPE, { ...options, isShorthand: true, name: options.name ?? options.expression });
  }

  async tokenEvaluatePromise(scope: FormatStringScope) {
    let expression = this.expression;
    if (expression.length > 0 && expression[0] == '?') {
      expression = expression.substring(1);
    }
    const value = await scope.getValuePromise(expression);
    const type = scope.getExpressionType(expression);
    return formatValueAsync(value, type, this.format);
  }

  clone(): this {
    return new ShorthandTokenExpression(this.options) as this;
  }
}

export async function formatValueAsync(value: any, type: TypeInterface, format: string): Promise<string> {
  if (value != null && typeof value._display == 'function') {
    // Object - recursive promise-based formatting.
    return value._display() as Promise<string>;
  } else {
    return formatValue(value, type, format);
  }
}
