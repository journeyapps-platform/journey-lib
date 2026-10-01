// # Query
// This module handles the parsing and representation of query expressions.
// It contains the logic to filter a single object based on an expression.
// It is up to the database adapters to perform optimised queries based on an index.

import { Variable } from '@ja-platform/parser-schema';
import { Day } from '@ja-platform/core-date';

import { ObjectData } from '../types/ObjectData';
import { Type } from '../types/Type';

// Build an expression from a hash such as {make: 'Nokia', model: '5800'}
export function expressionFromHash(scopeType: Type, hash: any): Expression {
  let operations: Operation[] = [];
  for (let key in hash) {
    if (hash.hasOwnProperty(key)) {
      let value = hash[key];
      const attribute = scopeType.getAttribute(key);
      if (attribute == null) {
        throw new Error(`'${key}' is not defined on '${scopeType.name}'`);
      }
      if (attribute.type.isObject && value != null) {
        value = value.id;
      }
      const operation = new Operation(attribute, '=', value);
      operations.push(operation);
    }
  }
  return new AndExpression(operations);
}

// ## Operation
// An operation has an attribute (variable), operator and (constant) value to compare with.

function discardMillis(ms) {
  return Math.floor(ms / 1000) * 1000;
}

export interface Expression {
  normalize(): NormalizedExpression;
  evaluate(object: Partial<ObjectData>): boolean;
  toOriginalExpression(): any[];
}

export class Operation implements Expression {
  attribute: Variable;
  operator: string;
  value: any;

  constructor(attribute: Variable, operator: string, value: any) {
    this.attribute = attribute;
    this.operator = operator;
    this.value = value;
  }

  normalize(): NormalizedExpression {
    if (this.operator == 'in') {
      // Allows using this in indexes
      return new OrExpression(this.value.map((v) => new AndExpression([new Operation(this.attribute, '=', v)])));
    }
    return new OrExpression([new AndExpression([this])]);
  }

  attributes() {
    return [this.attribute];
  }

  evaluate(object: Partial<ObjectData>) {
    let attributeValue;
    if (this.attribute.relationship) {
      attributeValue = object.belongs_to[this.attribute.relationship];
      if (typeof this.value == 'undefined') {
        // Most likely an incorrect parameter was passed to the query.
        // We don't want to interpret this the same as null.
        return false;
      }
    } else if (this.attribute.name == 'id') {
      attributeValue = object.id;
    } else {
      const rawAttributeValue = object.attributes[this.attribute.name];
      if (rawAttributeValue == null) {
        attributeValue = null;
      } else {
        attributeValue = this.attribute.type.valueFromJSON(rawAttributeValue);
      }
    }
    const compareDiff = compare(attributeValue, this.value);
    if (this.operator == '=') {
      if (compareDiff !== null) {
        return compareDiff === 0;
      }
      if (Array.isArray(attributeValue) && !Array.isArray(this.value)) {
        return false;
      }
      return attributeValue == this.value;
    } else if (this.operator == '!=') {
      if (compareDiff !== null) {
        return compareDiff !== 0;
      }
      if (Array.isArray(attributeValue) && !Array.isArray(this.value)) {
        return true;
      }
      return attributeValue != this.value;
    } else if (this.operator == '>') {
      if (compareDiff === null) {
        return false;
      }
      return compareDiff > 0;
    } else if (this.operator == '<') {
      if (compareDiff === null) {
        return false;
      }
      return compareDiff < 0;
    } else if (this.operator == '>=') {
      if (compareDiff === null) {
        return false;
      }
      return compareDiff >= 0;
    } else if (this.operator == '<=') {
      if (compareDiff === null) {
        return false;
      }
      return compareDiff <= 0;
    } else if (this.operator == 'contains') {
      if (typeof attributeValue == 'string' && typeof this.value == 'string') {
        return attributeValue.toLowerCase().indexOf(this.value.toLowerCase()) >= 0;
      } else if (Array.isArray(attributeValue) && Array.isArray(this.value)) {
        for (let child of this.value) {
          if (attributeValue!.indexOf(child) < 0) {
            return false;
          }
        }
        return true;
      } else if (Array.isArray(attributeValue)) {
        return attributeValue!.indexOf(this.value) >= 0;
      } else {
        return false;
      }
    } else if (this.operator == 'starts with') {
      if (typeof attributeValue == 'string' && typeof this.value == 'string') {
        return attributeValue.toLowerCase().indexOf(this.value.toLowerCase()) === 0;
      } else {
        return false;
      }
    } else if (this.operator == 'in') {
      if (Array.isArray(this.value)) {
        if (Array.isArray(attributeValue)) {
          return (
            this.value.findIndex((value) => {
              return attributeValue.indexOf(value) >= 0;
            }) >= 0
          );
        } else {
          return (
            this.value.findIndex((value) => {
              const compared = compare(attributeValue, value);
              return compared == 0 || (compared == null && value == attributeValue);
            }) >= 0
          );
        }
      } else {
        throw new Error("Array value is required for 'in' operator");
      }
    } else if (this.operator == 'not in') {
      if (Array.isArray(this.value)) {
        if (Array.isArray(attributeValue)) {
          return (
            this.value.findIndex((value) => {
              return attributeValue.indexOf(value) >= 0;
            }) == -1
          );
        } else {
          return (
            this.value.findIndex((value) => {
              const compared = compare(attributeValue, value);
              return compared == 0 || (compared == null && value == attributeValue);
            }) == -1
          );
        }
      } else {
        throw new Error("Array value is required for 'not in' operator");
      }
    } else {
      throw Error('Operator ' + this.operator + ' is not implemented yet');
    }
  }

  toString() {
    return this.attribute.name + ' ' + this.operator + ' ' + this.value;
  }

  toOriginalExpression() {
    if (this.attribute.relationship) {
      // Works for both relationships (user = ?) and relationship ids (user_id = ?)
      return [this.attribute.relationship + '_id ' + this.operator + ' ?', this.value];
    } else {
      return [this.attribute.name + ' ' + this.operator + ' ?', this.value];
    }
  }
}

function compare(a: any, b: any) {
  let compareDiff = null;
  if (typeof a == 'number' && typeof b == 'number') {
    compareDiff = a - b;
  } else if (typeof a == 'string' && typeof b == 'string') {
    if (a < b) {
      compareDiff = -1;
    } else if (a > b) {
      compareDiff = 1;
    } else {
      compareDiff = 0;
    }
  } else if (a instanceof Date && b instanceof Date) {
    // Compare seconds only
    compareDiff = discardMillis(a.getTime()) - discardMillis(b.getTime());
  } else if (Day.isDay(a) || Day.isDay(b)) {
    // New syntax only
    try {
      // Convert both to Days, in the local timezone.
      // Also works for JSON strings.
      compareDiff = new Day(a).valueOf() - new Day(b).valueOf();
    } catch (err) {
      compareDiff = null;
    }
  } else if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length != b.length) {
      return null;
    }
    for (let i = 0; i < a.length && i < b.length; i++) {
      const child = compare(a[i], b[i]);
      if (child != 0) {
        return null;
      }
    }
    return 0;
  }
  return compareDiff;
}

// ## RelationMatch
// A RelationMatch searches for a relationship match
export class RelationMatch implements Expression {
  name: string;
  id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  normalize() {
    return new OrExpression([new AndExpression([this])]);
  }

  evaluate(object: Partial<ObjectData>) {
    const relatedId = object.belongs_to[this.name];
    return relatedId == this.id;
  }

  toString() {
    return this.name + ' = ' + this.id;
  }

  toOriginalExpression() {
    return [this.name + '_id = ?', this.id];
  }
}

// ## AndExpression
// Takes any number of expressions, and combine them with an "and".
export class AndExpression implements Expression {
  constructor(public operands: Expression[]) {}

  join(otherAnd: AndExpression) {
    const ops = this.operands.concat(otherAnd.operands);
    return new AndExpression(ops);
  }

  normalize() {
    let i: number;
    // Step 1: filter out TrueExpression
    let operands: Expression[] = [];
    for (i = 0; i < this.operands.length; i++) {
      const op = this.operands[i];
      if (!(op instanceof TrueExpression)) {
        operands.push(op);
      }
    }
    if (operands.length === 0) {
      return new TrueExpression().normalize();
    } else if (operands.length == 1) {
      return operands[0].normalize();
    } else if (operands.length > 2) {
      const a = new AndExpression(operands.slice(0, 2));
      const b = new AndExpression(operands.slice(2));
      return new AndExpression([a, b]).normalize();
    } else {
      const left = operands[0].normalize().operands;
      const right = operands[1].normalize().operands;
      let newOperands = [];
      for (i = 0; i < left.length; i++) {
        for (let j = 0; j < right.length; j++) {
          newOperands.push(left[i].join(right[j]));
        }
      }
      return new OrExpression(newOperands);
    }
  }

  evaluate(object: Partial<ObjectData>) {
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      if (!operand.evaluate(object)) {
        return false;
      }
    }
    return true;
  }

  toString() {
    let s = '(';
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      s += operand.toString();
      if (i != this.operands.length - 1) {
        s += ' and ';
      }
    }
    s += ')';
    return s;
  }

  toOriginalExpression() {
    let args = [];
    let s = '(';
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      if (operand instanceof TrueExpression) continue;
      let opPair = operand.toOriginalExpression();
      if (opPair[0] == '') {
        // nested TrueExpression
        continue;
      }
      if (s.length > 1) {
        // Not the first operand
        s += ' and ';
      }
      s += opPair[0];
      args.push.apply(args, opPair.slice(1));
    }
    s += ')';
    if (s.length == 2) {
      return new TrueExpression().toOriginalExpression();
    }
    return [s, ...args];
  }
}

// ## OrExpression
// Takes any number of expressions, and combine them with an "or".
export class OrExpression<T extends Expression = Expression> implements Expression {
  constructor(public operands: T[]) {}

  normalize() {
    const newOperands: AndExpression[] = [];
    this.operands.forEach(function (op) {
      const norm: NormalizedExpression = op.normalize();
      norm.operands.forEach(function (subop) {
        newOperands.push(subop);
      });
    });
    return new OrExpression<AndExpression>(newOperands);
  }

  evaluate(object: Partial<ObjectData>) {
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      if (operand.evaluate(object)) {
        return true;
      }
    }
    return false;
  }

  toString() {
    let s = '(';
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      s += operand.toString();
      if (i != this.operands.length - 1) {
        s += ' or ';
      }
    }
    s += ')';
    return s;
  }

  toOriginalExpression() {
    let args = [];
    let s = '(';
    for (let i = 0; i < this.operands.length; i++) {
      const operand = this.operands[i];
      if (operand instanceof TrueExpression) {
        // One TrueExpression makes the entire OR clause true
        return operand.toOriginalExpression();
      }
      const opPair = operand.toOriginalExpression();
      s += opPair[0];
      args.push.apply(args, opPair.slice(1));
      if (i != this.operands.length - 1) {
        s += ' or ';
      }
    }
    s += ')';
    return [s, ...args];
  }
}

export type NormalizedExpression = OrExpression<AndExpression>;

// ## TrueExpression
// Simple expression that is always true.
export class TrueExpression implements Expression {
  constructor() {}

  normalize() {
    return new OrExpression<AndExpression>([new AndExpression([this])]);
  }

  evaluate(object: ObjectData) {
    return true;
  }

  toString() {
    return 'true';
  }

  toOriginalExpression(): string[] {
    return [''];
  }
}

// We should probably support international characters as well
function isLetter(character: string) {
  return (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z');
}
function isDigit(character: string) {
  return character >= '0' && character <= '9';
}

const OPERATORS = ['>=', '<=', '=', '!=', '>', '<', 'starts with', 'contains', 'in', 'not in'];
const BOOLEAN_LOGIC = ['and', 'or'];

// ## Tokenizer
// The Tokenizer is responsible for interpreting the raw characters, and splitting the expression into
// tokens.
export class Tokenizer {
  i: number = 0;
  previousPosition: number;
  private interpolatorCount: number = 0;

  constructor(public expression: string) {
    if (expression == null) {
      throw new Error('expression is required');
    }
    this.advance();
  }

  exception(message: string, start?: number, end?: number) {
    let error = new Error(message + '\n' + this.expression + '\n' + new Array(this.i + 1).join(' ') + '^');
    if (start == null) {
      start = this.i;
    }
    (error as any).position = start;
    (error as any).positionEnd = end == null ? start + 1 : end;
    (error as any).plainMessage = message;
    return error;
  }

  isWordSeparator(p: number) {
    return p >= this.expression.length || this.expression[p] == ' ';
  }

  isWord() {
    this.checkBuffer();
    return isLetter(this.expression[this.i]) || this.expression[this.i] == '_';
  }

  hasMore() {
    return this.i < this.expression.length;
  }

  // Read an operator, for example "!=" or "starts with".
  readOperator() {
    return this.readToken(OPERATORS);
  }

  // Read an "and" or "or".
  readBooleanLogic() {
    return this.readToken(BOOLEAN_LOGIC);
  }

  // Is the current token an "or"?
  isOr() {
    return this.isToken(['or']);
  }

  // Is the current token an "and"?
  isAnd() {
    return this.isToken(['and']);
  }

  // Are we at a closing or opening parenthesis?
  isParenthesis() {
    this.checkBuffer();
    return this.expression[this.i] == '(' || this.expression[this.i] == ')';
  }

  // Read a single parenthesis. Throws an exception if we are not at one.
  readParenthesis() {
    if (!this.isParenthesis()) {
      throw this.exception('Expected ( or )');
    }
    const c = this.expression[this.i];
    this.i++;
    this.advance();
    return c;
  }

  // Read an interpolation character "?"
  readInterpolator() {
    this.checkBuffer();
    if (this.expression[this.i] == '?' && (this.isWordSeparator(this.i + 1) || this.expression[this.i + 1] == ')')) {
      this.i += 1;
      this.advance();
      return this.interpolatorCount++;
    } else {
      throw this.exception('Expected ?');
    }
  }

  // Read a single alphanumeric word. May contain underscores.
  readWord() {
    this.checkBuffer();
    let word = '';
    word += this.expression[this.i];
    let offset = 1;
    while (
      this.expression.length > this.i + offset &&
      (isLetter(this.expression[this.i + offset]) ||
        isDigit(this.expression[this.i + offset]) ||
        this.expression[this.i + offset] == '_')
    ) {
      word += this.expression[this.i + offset++];
    }
    this.i += offset;
    this.advance();
    return word;
  }

  // Advance to the next non-whitespace character.
  private advance() {
    this.previousPosition = this.i - 1;
    while (this.hasMore() && this.expression[this.i] == ' ') {
      this.i++;
    }
  }

  private checkBuffer() {
    if (!this.hasMore()) {
      throw this.exception('Unexpected end of expression');
    }
  }

  // Given an array of tokens, read and return one of them at the current position.
  // Throws an exception if none of them are found.
  // Use isToken() first to check if one of the tokens is present.
  private readToken(tokens: string[]) {
    this.checkBuffer();
    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      if (this.i + token.length <= this.expression.length) {
        if (token == this.expression.substring(this.i, this.i + token.length)) {
          this.i += token.length;
          this.advance();
          return token;
        }
      }
    }
    throw this.exception('Expected one of ' + JSON.stringify(tokens));
  }

  // Checks if one of the given array of tokens is present at the current position.
  private isToken(tokens: string[]) {
    this.checkBuffer();
    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      if (this.i + token.length <= this.expression.length) {
        if (token == this.expression.substring(this.i, this.i + token.length)) {
          if (!isLetter(token[token.length - 1]) || this.isWordSeparator(this.i + token.length)) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

// ## Parser
// The parser uses the tokenizer to build an Expression object.
export class Parser {
  constructor(private scopeType: Type, private tokenizer: Tokenizer, private args: any[]) {
    if (args == null) {
      this.args = [];
    }
  }

  parse(): Expression {
    const e = this.parseOrExpression();
    if (this.tokenizer.hasMore()) {
      throw this.tokenizer.exception('Invalid expression (expected expression to end)');
    }
    return e;
  }

  /*
   expr    : term ( ( AND | OR ) term ) *
   term    : ( attribute operator value ) | ( \( expression \) )
   factor  : NUMBER ;
  */
  private parseOrExpression(): Expression {
    const e = this.parseAndExpression();
    if (this.tokenizer.hasMore() && this.tokenizer.isOr()) {
      let expressions = [e];
      while (this.tokenizer.hasMore() && this.tokenizer.isOr()) {
        this.tokenizer.readBooleanLogic();
        expressions.push(this.parseAndExpression());
      }
      return new OrExpression(expressions);
    } else {
      return e;
    }
  }

  private parseAndExpression(): Expression {
    const e = this.parseTerm();
    if (this.tokenizer.hasMore() && this.tokenizer.isAnd()) {
      let expressions = [e];
      while (this.tokenizer.hasMore() && this.tokenizer.isAnd()) {
        this.tokenizer.readBooleanLogic();
        expressions.push(this.parseTerm());
      }
      return new AndExpression(expressions);
    } else {
      return e;
    }
  }

  private parseTerm(): Expression {
    if (this.tokenizer.isWord()) {
      let attributeStart = this.tokenizer.i;
      const attributeName = this.tokenizer.readWord();
      let attributeEnd = this.tokenizer.previousPosition + 1;
      const operator = this.tokenizer.readOperator();
      let interpolatorPosition = this.tokenizer.i;
      const valueIndex = this.tokenizer.readInterpolator();

      const attribute = this.scopeType.getAttribute(attributeName);
      if (attribute == null) {
        throw this.tokenizer.exception(
          "'" + attributeName + "' is not a valid field of '" + this.scopeType.name + "'",
          attributeStart,
          attributeEnd
        );
      } else if (attribute.type.isCollection) {
        throw this.tokenizer.exception(
          "Cannot query by has-many field '" + attributeName + "'",
          attributeStart,
          attributeEnd
        );
      }
      if (this.args.length > valueIndex) {
        let value = this.args[valueIndex];
        if (attribute.type.isObject && value != null) {
          value = value.id;
        }
        return new Operation(attribute, operator, value);
      } else {
        throw this.tokenizer.exception('Not enough arguments to interpolate', interpolatorPosition);
      }
    } else if (this.tokenizer.isParenthesis()) {
      let c = this.tokenizer.readParenthesis();
      if (c != '(') {
        throw this.tokenizer.exception('Expected (', this.tokenizer.previousPosition);
      }
      const e = this.parseOrExpression();
      c = this.tokenizer.readParenthesis();
      if (c != ')') {
        throw this.tokenizer.exception('Expected )', this.tokenizer.previousPosition);
      }
      return e;
    } else {
      throw this.tokenizer.exception('Expected attribute name or (');
    }
  }
}

export function parse(scopeType: Type, expression: string, args: any[]) {
  return new Parser(scopeType, new Tokenizer(expression), args).parse();
}
