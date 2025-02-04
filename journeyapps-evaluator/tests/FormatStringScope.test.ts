import { describe, it, expect, beforeEach } from 'vitest';
import { FormatString, VariableFormatStringScope, VariableScope } from '../src';
import { MockType } from './mocks/MockType';
import { MockVariableScope } from './mocks/MockVariableScope';
import { MockVariableType } from './mocks/MockVariableType';

declare module 'vitest' {
  export interface TestContext {
    scope: VariableScope;
  }
}

function evaluate(expression: string, scope: VariableScope) {
  return new FormatString({ expression }).evaluate(new VariableFormatStringScope(scope));
}

function evaluatePromise(expression: string, scope: VariableScope) {
  return new FormatString({ expression }).evaluatePromise(new VariableFormatStringScope(scope));
}

describe('Evaluate', () => {
  beforeEach((context) => {
    const oneVar = new MockVariableType('one', new MockType('number'));
    const piVar = new MockVariableType('pi', new MockType('number'));
    const viewType = new MockType('view', { one: oneVar, pi: piVar });
    const personType = new MockType('person');

    const scope = new MockVariableScope(viewType);
    scope.name = 'Test';
    scope.serial = 12345;
    scope.pi = 3.14159265359;
    scope.one = 1.1;
    scope.person = {
      type: personType,
      name: 'Peter',
      surname: null,
      toString: () => 'Custom String'
    };

    context.scope = scope;
  });

  it('should handle plain text', ({ scope }) => {
    expect(evaluate('Plain text', scope)).toBe('Plain text');
    expect(evaluate('person.name', scope)).toBe('person.name');
  });

  it('should escape double braces', ({ scope }) => {
    expect(evaluate('{{person.name}}', scope)).toBe('{person.name}');
    expect(evaluate('{{}}', scope)).toBe('{}');
    expect(evaluate('Hi {{person.name}}!', scope)).toBe('Hi {person.name}!');
  });

  it('should handle constants', ({ scope }) => {
    expect(VariableFormatStringScope.getValue(scope, 'null')).toBe(null);
    expect(VariableFormatStringScope.getValue(scope, 'false')).toBe(false);
    expect(VariableFormatStringScope.getValue(scope, 'true')).toBe(true);

    expect(VariableFormatStringScope.getValuePromise(scope, 'null')).resolves.toEqual(null);
    expect(VariableFormatStringScope.getValuePromise(scope, 'false')).resolves.toEqual(false);
    expect(VariableFormatStringScope.getValuePromise(scope, 'true')).resolves.toEqual(true);

    expect(evaluate('{null}', scope)).toBe('');
    expect(evaluate('{false}', scope)).toBe('false');
    expect(evaluate('{true}', scope)).toBe('true');
  });

  it('should handle view variables', ({ scope }) => {
    expect(evaluate('{name}', scope)).toBe('Test');
    expect(evaluate('{person.name}', scope)).toBe('Peter');
    expect(evaluate('{person.surname}', scope)).toBe('');
    expect(evaluate('{undefined_variable}', scope)).toBe('');
  });

  it('should handle view variables via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise('{name}', scope)).resolves.toEqual('Test');
    expect(evaluatePromise('{person.name}', scope)).resolves.toEqual('Peter');
    expect(evaluatePromise('{person.surname}', scope)).resolves.toEqual('');
    expect(evaluatePromise('{undefined_variable}', scope)).resolves.toEqual('');
  });

  it('should handle undefined variables', ({ scope }) => {
    expect(evaluate('{ghost}', scope)).toBe('');
    expect(evaluate('{ghost.name}', scope)).toBe('');
  });

  it('should handle undefined variables via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise('{ghost}', scope)).resolves.toEqual('');
    expect(evaluatePromise('{ghost.name}', scope)).resolves.toEqual('');
  });

  it('should handle object display names', ({ scope }) => {
    expect(evaluate('{person}', scope)).toBe('Custom String');
  });

  it('should handle object display names via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise('{person}', scope)).resolves.toEqual('Custom String');
  });

  it('should handle mixed text', ({ scope }) => {
    expect(evaluate('Asset {serial}', scope)).toBe('Asset 12345');
    expect(evaluate('{{some text}} more {serial}', scope)).toBe('{some text} more 12345');
  });

  it('should handle TemplateLiterals', ({ scope }) => {
    expect(evaluate('{`TEMPLATE`}', scope)).toBe('{$:`TEMPLATE`}');
    expect(evaluate("{`TEMPLATE ${'true'}`}", scope)).toBe("{$:`TEMPLATE ${'true'}`}");
    expect(evaluate('{`TEMPLATE ${view.users.length ?? 0}`}', scope)).toBe('{$:`TEMPLATE ${view.users.length ?? 0}`}');
  });

  it('should handle mixed text via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise('Asset {serial}', scope)).resolves.toEqual('Asset 12345');
    expect(evaluatePromise('{{some text}} more {serial}', scope)).resolves.toEqual('{some text} more 12345');
  });

  it('should handle format specifiers for decimal numbers', ({ scope }) => {
    expect(evaluate('{pi}', scope)).toBe('3.14159265359');
    expect(evaluate('{one}', scope)).toBe('1.1');
    expect(evaluate('{pi:.3f}', scope)).toBe('3.142');
    expect(evaluate('{pi:.0f}', scope)).toBe('3');
  });

  it('should handle format specifiers for decimal numbers via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise('{pi}', scope)).resolves.toEqual('3.14159265359');
    expect(evaluatePromise('{one}', scope)).resolves.toEqual('1.1');
    expect(evaluatePromise('{pi:.3f}', scope)).resolves.toEqual('3.142');
    expect(evaluatePromise('{pi:.0f}', scope)).resolves.toEqual('3');
  });

  it('should handle null & undefined', ({ scope }) => {
    expect(evaluate(null, scope)).toBe('');
    expect(evaluate(undefined, scope)).toBe('');
    expect(evaluate('', scope)).toBe('');
  });

  it('should handle null & undefined via tokenEvaluatePromise', ({ scope }) => {
    expect(evaluatePromise(null, scope)).resolves.toEqual('');
    expect(evaluatePromise(undefined, scope)).resolves.toEqual('');
    expect(evaluatePromise('', scope)).resolves.toEqual('');
  });
});
