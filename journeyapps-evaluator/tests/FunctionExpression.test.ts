import { describe, expect, it } from 'vitest';
import { FunctionExpression, TextExpression, PrimitiveConstantExpression, JSToken } from '../src';

describe('FunctionExpression', () => {
  it('changes argument count while retaining the wrapper, comments and source', () => {
    const expression = FunctionExpression.parse('/* save */ $:save(true); // end');
    expect(expression.withArguments([]).stringify()).toBe('/* save */ $:save(); // end');
    expect(
      expression
        .withArguments([new TextExpression({ expression: 'one' }), new TextExpression({ expression: 'two' })])
        .stringify()
    ).toBe("/* save */ $:save('one', 'two'); // end");
  });
  it('changes the call target without changing matching text in comments or arguments', () => {
    const expression = FunctionExpression.parse('/* save */ $:save("save"); // save');
    expect(expression.withName('update').stringify()).toBe('/* save */ $:update("save"); // save');
  });
  it('replaces arguments while preserving surrounding tokens and evaluation source', async () => {
    const source = '$:save( /* first */ "before", find(true) )';
    const expression = FunctionExpression.parse(source);
    const updated = expression.withArguments([
      new TextExpression({ expression: "it's after" }),
      FunctionExpression.parse('$:find(false)')
    ]);
    expect(updated.stringify()).toBe("$:save( /* first */ 'it\\'s after', find(false) )");
    expect(expression.stringify()).toBe(source);
    expect(expression.withArgumentSources(['42', 'find(false)']).stringify()).toBe(
      '$:save( /* first */ 42, find(false) )'
    );
    let evaluated: string;
    await updated.evaluatePromise({
      evaluateFunctionExpression: async (source) => {
        evaluated = source;
      }
    } as any);
    expect(evaluated).toBe("save( /* first */ 'it\\'s after', find(false) )");
  });
  it('keeps parenthesized arguments and ignores punctuation inside comments when editing', () => {
    const expression = FunctionExpression.parse('$:save /* (comment) */ (first, (second, third))');
    expect(expression.withArgumentSources([expression.js.sourceOf(expression.arguments[1])]).stringify()).toBe(
      '$:save /* (comment) */ ((second, third))'
    );
    expect(expression.withArguments([]).stringify()).toBe('$:save /* (comment) */ ()');
  });
  it('owns its Babel tree when cloned', () => {
    const expression = FunctionExpression.parse('$:save(find(true))');
    const clone = expression.clone();
    expect(clone.js.ast).not.toBe(expression.js.ast);
    expect(clone.arguments[0]).not.toBe(expression.arguments[0]);
    expect(clone.stringify()).toBe(expression.stringify());
  });
  it('exposes validity when replacing a call with another expression type', () => {
    const expression = FunctionExpression.parse('$:save()');
    expect(() => FunctionExpression.parse('$:value + 1')).toThrow(SyntaxError);
    const replaced = expression.withCode(new JSToken('true'));
    expect(replaced.isValid()).toBe(false);
    expect(expression.isValid()).toBe(true);
  });
});
