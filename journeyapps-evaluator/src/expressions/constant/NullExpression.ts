import { ExpressionParser } from '../../ExpressionParser';
import { requireExpression } from '../../utils/parserUtils';
import { ConstantExpression, ConstantExpressionParser } from './ConstantExpression';
import { AbstractExpressionOptions } from '../AbstractExpression';
import { ExpressionSource } from '../../tokens';

export class NullExpression extends ConstantExpression<null> {
  static readonly TYPE = 'null-expression';
  static parse(source: ExpressionSource, start = 0): NullExpression {
    return requireExpression(new NullExpressionParser(), source, start);
  }
  constructor(options: Omit<AbstractExpressionOptions<null>, 'expression'> = {}) {
    super({ ...options, expression: null });
    this.type = NullExpression.TYPE;
  }

  isValid(): boolean {
    return super.isValid() && this.expression === null;
  }
}

/**
 * Recognize the literal syntax owned by NullExpression.
 */
export class NullExpressionParser implements ExpressionParser<NullExpression> {
  tryParse(source: ExpressionSource, start = 0): NullExpression | null {
    const constant = new ConstantExpressionParser().tryParse(source, start);
    let expression: NullExpression | null = null;
    if (constant && constant.value() === null) {
      expression = new NullExpression(constant.options);
    }
    return expression;
  }
}
