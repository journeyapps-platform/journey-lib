import traverse, { NodePath } from '@babel/traverse';
import {
  Expression,
  Node,
  CallExpression,
  OptionalCallExpression,
  file,
  program,
  expressionStatement
} from '@babel/types';
import { CodeToken, CodeReference } from './CodeToken';
import { AbstractToken } from '../AbstractToken';
import { TextToken } from '../text/TextToken';
import { CodeParser } from '../../code-parsers/CodeParser';
import { JavaScriptParser } from '../../code-parsers/JavaScriptParser';

/**
 * JavaScript stays as one source token containing Babel's tree, without a second expression tree.
 * Babel node offsets are relative to this token's source; start locates it in the surrounding source.
 */
export class JSToken extends CodeToken<CallExpression['arguments'][number]> {
  private static readonly parser = new JavaScriptParser();
  readonly ast: Expression;
  readonly code: string;
  readonly hasTrailingLineComment: boolean;
  private readonly lexemes: readonly { start: number; end: number }[];

  constructor(source: string, start = 0) {
    super(source, start);
    const parsed = CodeParser.getInstance().parse(source, JSToken.parser);
    this.ast = parsed.ast;
    this.code = parsed.code;
    this.hasTrailingLineComment = parsed.hasTrailingLineComment;
    this.lexemes = parsed.lexemes;
    Object.freeze(this);
  }

  get arguments(): CallExpression['arguments'] {
    return this.call().arguments;
  }

  functionName(): string {
    return this.sourceOf(this.call().callee);
  }

  isCallExpression(): boolean {
    return this.ast.type === 'CallExpression' || this.ast.type === 'OptionalCallExpression';
  }

  isReferenceExpression(): boolean {
    return ['Identifier', 'MemberExpression', 'OptionalMemberExpression'].includes(this.ast.type);
  }

  withName(name: string): JSToken {
    const callee = this.call().callee;
    return this.replace([{ start: callee.start, end: callee.end, text: name }]);
  }

  withArguments(args: readonly string[]): JSToken {
    const call = this.call();
    let edits: { start: number; end: number; text: string }[];
    // Replacing arguments individually retains the original separators and comments. If the count
    // changes, replace the entire argument list so there are no leftover commas or old arguments.
    if (args.length === call.arguments.length) {
      edits = call.arguments.map((argument, index) => ({
        start: argument.start,
        end: argument.end,
        text: args[index]
      }));
    } else {
      const open = this.punctuationAfter('(', call.callee.end);
      edits = [{ start: open + 1, end: call.end - 1, text: args.join(', ') }];
    }
    return this.replace(edits);
  }

  /**
   * Rewrite unbound references and direct calls, retaining scopes, property names and source trivia.
   * Return null to leave a reference unchanged. Replacement source is not visited again.
   */
  rewriteReferences(rewrite: (reference: CodeReference) => CodeToken | null): JSToken {
    const edits: { start: number; end: number; text: string }[] = [];
    const render = (start: number, end: number): string => {
      let source = this.source.slice(start, end);
      for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
        if (edit.start >= start && edit.end <= end) {
          source = source.slice(0, edit.start - start) + edit.text + source.slice(edit.end - start);
        }
      }
      return source;
    };
    const replacementSource = (replacement: CodeToken, parent: Node): string => {
      let javascript: JSToken;
      if (replacement instanceof JSToken) {
        javascript = replacement;
      } else {
        javascript = new JSToken(replacement.code);
      }
      let source = javascript.code;
      // A replacement must keep its precedence in a larger expression. Atomic values and calls
      // need no wrapper; compound expressions do, unless their source is already parenthesized.
      const atomic = [
        'Identifier',
        'MemberExpression',
        'OptionalMemberExpression',
        'CallExpression',
        'OptionalCallExpression',
        'StringLiteral',
        'NumericLiteral',
        'BooleanLiteral',
        'NullLiteral',
        'BigIntLiteral',
        'RegExpLiteral',
        'TemplateLiteral',
        'ThisExpression'
      ];
      const numericMember =
        javascript.ast.type === 'NumericLiteral' &&
        (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression');
      const constructorCallee =
        parent.type === 'NewExpression' && !['Identifier', 'MemberExpression'].includes(javascript.ast.type);
      if (
        (!atomic.includes(javascript.ast.type) || numericMember || constructorCallee) &&
        !javascript.ast.extra?.parenthesized
      ) {
        source = `(${source})`;
      }
      return source;
    };
    const replaceCall = (path: NodePath<CallExpression | OptionalCallExpression>): void => {
      const node = path.node;
      if (node.callee.type === 'Identifier' && !path.scope.hasBinding(node.callee.name, true)) {
        const args = node.arguments.map((argument): AbstractToken => {
          let start = argument.start;
          if (argument.extra?.parenthesized) {
            start = argument.extra.parenStart as number;
          }
          const source = render(start, start + this.sourceOf(argument).length);
          let token: AbstractToken;
          if (argument.type === 'SpreadElement') {
            token = new TextToken(source, this.start + start);
          } else {
            token = new JSToken(source, this.start + start);
          }
          return token;
        });
        const replacement = rewrite({ name: node.callee.name, isCall: true, arguments: args });
        if (replacement) {
          // Calls are visited after their children. Their argument tokens include nested edits,
          // which are folded into the call replacement to keep the final edits from overlapping.
          for (let index = edits.length - 1; index >= 0; index--) {
            if (edits[index].start >= node.start && edits[index].end <= node.end) {
              edits.splice(index, 1);
            }
          }
          edits.push({ start: node.start, end: node.end, text: replacementSource(replacement, path.parent) });
        }
      }
    };
    traverse(file(program([expressionStatement(this.ast)])), {
      ReferencedIdentifier: (path) => {
        const parent = path.parent;
        const isCallee =
          (parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && parent.callee === path.node;
        if (!isCallee && !path.scope.hasBinding(path.node.name, true)) {
          const replacement = rewrite({ name: path.node.name, isCall: false, arguments: [] });
          if (replacement) {
            let text = replacementSource(replacement, parent);
            if (parent.type === 'ObjectProperty' && parent.shorthand) {
              text = `${path.node.name}: ${text}`;
            }
            edits.push({ start: path.node.start, end: path.node.end, text });
          }
        }
      },
      CallExpression: { exit: replaceCall },
      OptionalCallExpression: { exit: replaceCall }
    });
    return this.replace(edits);
  }

  private call(): CallExpression | OptionalCallExpression {
    const node = this.ast;
    if (node.type !== 'CallExpression' && node.type !== 'OptionalCallExpression')
      throw new Error('Only a call expression has a call target and argument list.');
    return node;
  }

  private replace(edits: readonly { start: number; end: number; text: string }[]): JSToken {
    let source = this.source;
    // Apply edits from right to left so earlier source offsets stay valid.
    for (const edit of [...edits].sort((a, b) => b.start - a.start))
      source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    return new JSToken(source, this.start);
  }

  sourceOf(node: Node): string {
    let start = node.start;
    let end = node.end;
    if (node.extra?.parenthesized) {
      start = node.extra.parenStart as number;
    }
    // Babel records a parenthesized expression's opening offset separately. Find its matching
    // closing token to include the complete wrapper when reusing it as an argument.
    if (start !== node.start) {
      let depth = 0;
      let closed = false;
      for (const token of this.lexemes) {
        if (token.start >= start) {
          const text = this.source.slice(token.start, token.end);
          if (text === '(') {
            depth++;
          } else if (text === ')') {
            depth--;
            if (depth === 0) {
              end = token.end;
              closed = true;
              break;
            }
          }
        }
      }
      if (!closed) {
        throw new SyntaxError('Expected a closing parenthesis.');
      }
    }
    return this.source.slice(start, end);
  }

  punctuationAfter(text: string, start: number): number {
    const token = this.lexemes.find(
      (token) => token.start >= start && this.source.slice(token.start, token.end) === text
    );
    if (!token) throw new SyntaxError(`Expected ${text} after offset ${start}.`);
    return token.start;
  }

  clone(): JSToken {
    return new JSToken(this.source, this.start);
  }
}
