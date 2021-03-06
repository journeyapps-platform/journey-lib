import * as evaluator from '../../src/index';
const {
  TokenExpression,
  ConstantTokenExpression,
  FunctionTokenExpression,
  LegacyFunctionTokenExpression,
  ShorthandTokenExpression,
  FormatShorthandTokenExpression
} = evaluator;

describe('TokenExpression', function () {
  it('should be abstract', function () {
    let token = null;
    const construction = function () {
      token = new (TokenExpression as any)('xyz', 4);
    };
    expect(construction).toThrowError();
    expect(token).toBeNull();
  });
});

describe('ConstantTokenExpression', function () {
  it('should construct a TokenExpression', function () {
    const token = new ConstantTokenExpression('XYZ', 3);
    expect(token).toEqual(jasmine.any(TokenExpression));
    expect(token.expression).toEqual('XYZ');
    expect(token.valueOf()).toEqual('XYZ');
    expect(token.start).toEqual(3);
    expect(token.format).toBeNull();
    expect(token.isConstant()).toEqual(true);
    expect(token.isShorthand()).toEqual(false);
    expect(token.isFunction()).toEqual(false);
  });
});

describe('FunctionTokenExpression', function () {
  it('should construct a TokenExpression', function () {
    const token = new FunctionTokenExpression('$:foo()', 3);
    expect(token).toEqual(jasmine.any(TokenExpression));
    expect(token.expression).toEqual('foo()');
    expect(token.start).toEqual(3);
    expect(token.format).toBeNull();
    expect(token.isConstant()).toEqual(false);
    expect(token.isShorthand()).toEqual(false);
    expect(token.isFunction()).toEqual(true);
  });

  it('should have the correct prefix', function () {
    // purely for safety, just testing the contant value
    expect(FunctionTokenExpression.PREFIX).toEqual('$:');
  });

  it('should remove the prefix from the expression', function () {
    const token = new FunctionTokenExpression('$:foo()', 5);
    expect(token.expression).toEqual('foo()');
    expect(token.start).toEqual(5);
  });

  it('should allow expressions without the prefix', function () {
    const token = new FunctionTokenExpression('foo()', 5);
    expect(token.expression).toEqual('foo()');
    expect(token.start).toEqual(5);
  });

  it('should give the function name', function () {
    const token = new FunctionTokenExpression('$:foo()', 5);
    expect(token.functionName()).toEqual('foo');
  });

  it('should give the function name where there are arguments', function () {
    const token = new FunctionTokenExpression('$:foo(5, "bar")', 5);
    expect(token.functionName()).toEqual('foo');
  });

  it('should be able to convert to a constant token expression without escape tags by default', function () {
    const token = new FunctionTokenExpression('$:foo()', 5);
    expect(token.expression).toEqual('foo()'); // safety check
    const constantToken = token.toConstant();
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('$:foo()');
    expect(constantToken.valueOf()).toEqual('$:foo()');
    expect(constantToken.start).toEqual(5);
  });

  it('should be able to convert to a constant token expression without escape tags', function () {
    const token = new FunctionTokenExpression('$:foo()', 5);
    expect(token.expression).toEqual('foo()'); // safety check
    const constantToken = token.toConstant(false);
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('$:foo()');
    expect(constantToken.valueOf()).toEqual('$:foo()');
    expect(constantToken.start).toEqual(5);
  });

  it('should be able to convert to a constant token expression with escape tags', function () {
    const token = new FunctionTokenExpression('$:foo()', 5);
    expect(token.expression).toEqual('foo()'); // safety check
    const constantToken = token.toConstant(true);
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('{$:foo()}');
    expect(constantToken.valueOf()).toEqual('{$:foo()}');
    expect(constantToken.start).toEqual(5);
  });
});

describe('LegacyFunctionTokenExpression', function () {
  it('should construct a TokenExpression', function () {
    const token = new LegacyFunctionTokenExpression('foo', 3);
    expect(token).toEqual(jasmine.any(TokenExpression));
    expect(token.expression).toEqual('foo');
    expect(token.start).toEqual(3);
    expect(token.format).toBeNull();
    expect(token.isConstant()).toEqual(false);
    expect(token.isShorthand()).toEqual(false);
    expect(token.isFunction()).toEqual(true);
  });

  it('should be able to convert to a constant token expression without escape tags by default', function () {
    const token = new LegacyFunctionTokenExpression('foo', 5);
    expect(token.expression).toEqual('foo'); // safety check
    const constantToken = token.toConstant();
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('foo');
    expect(constantToken.valueOf()).toEqual('foo');
    expect(constantToken.start).toEqual(5);
  });

  it('should be able to convert to a constant token expression without escape tags', function () {
    const token = new LegacyFunctionTokenExpression('foo', 5);
    expect(token.expression).toEqual('foo'); // safety check
    const constantToken = token.toConstant(false);
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('foo');
    expect(constantToken.valueOf()).toEqual('foo');
    expect(constantToken.start).toEqual(5);
  });

  it('should be able to convert to a constant token expression with escape tags', function () {
    const token = new LegacyFunctionTokenExpression('foo', 5);
    expect(token.expression).toEqual('foo'); // safety check
    const constantToken = token.toConstant(true);
    expect(constantToken).toEqual(jasmine.any(ConstantTokenExpression));
    expect(constantToken.expression).toEqual('{foo}');
    expect(constantToken.valueOf()).toEqual('{foo}');
    expect(constantToken.start).toEqual(5);
  });
});

describe('ShorthandTokenExpression', function () {
  it('should construct a TokenExpression', function () {
    const token = new ShorthandTokenExpression('person.name', 3);
    expect(token).toEqual(jasmine.any(TokenExpression));
    expect(token.expression).toEqual('person.name');
    expect(token.start).toEqual(3);
    expect(token.format).toBeNull();
    expect(token.isConstant()).toEqual(false);
    expect(token.isShorthand()).toEqual(true);
    expect(token.isFunction()).toEqual(false);
  });
});

describe('FormatShorthandTokenExpression', function () {
  it('should construct a TokenExpression', function () {
    const token = new FormatShorthandTokenExpression('product.price', '.2f', 3);
    expect(token).toEqual(jasmine.any(TokenExpression));
    expect(token.expression).toEqual('product.price');
    expect(token.start).toEqual(3);
    expect(token.format).toEqual('.2f');
    expect(token.isConstant()).toEqual(false);
    expect(token.isShorthand()).toEqual(true);
    expect(token.isFunction()).toEqual(false);
  });
});

describe('functionTokenExpression', function () {
  it('should return null for a null input', function () {
    //noinspection JSCheckFunctionSignatures
    expect(evaluator.functionTokenExpression(null)).toBeNull();
  });

  it('should return a function token expression', function () {
    const token = evaluator.functionTokenExpression('$:foo()');
    expect(token).toEqual(jasmine.any(FunctionTokenExpression));
    expect(token.expression).toEqual('foo()');
  });

  it('should return a legacy token expression', function () {
    const token = evaluator.functionTokenExpression('foo');
    expect(token).toEqual(jasmine.any(LegacyFunctionTokenExpression));
    expect(token.expression).toEqual('foo');
  });

  it('should return a legacy token expression if explicitly allowed', function () {
    const token = evaluator.functionTokenExpression('foo', true);
    expect(token).toEqual(jasmine.any(LegacyFunctionTokenExpression));
    expect(token.expression).toEqual('foo');
  });

  it('should return null for a legacy token expression when not allowed', function () {
    const token = evaluator.functionTokenExpression('foo', false);
    expect(token).toBeNull();
  });
});

describe('actionableTokenExpression', function () {
  it('should return null for a null input', function () {
    //noinspection JSCheckFunctionSignatures
    expect(evaluator.actionableTokenExpression(null)).toBeNull();
  });

  it('should return a function token expression', function () {
    const token = evaluator.actionableTokenExpression('$:foo()');
    expect(token).toEqual(jasmine.any(FunctionTokenExpression));
    expect(token.expression).toEqual('foo()');
  });

  it('should return a shorthand token expression', function () {
    const token = evaluator.actionableTokenExpression('person.name');
    expect(token).toEqual(jasmine.any(ShorthandTokenExpression));
    expect(token.expression).toEqual('person.name');
  });

  it('should return a format shorthand token expression', function () {
    const token = evaluator.actionableTokenExpression('product.price:.2f');
    expect(token).toEqual(jasmine.any(FormatShorthandTokenExpression));
    expect(token.expression).toEqual('product.price');
    expect(token.format).toEqual('.2f');
  });
});
