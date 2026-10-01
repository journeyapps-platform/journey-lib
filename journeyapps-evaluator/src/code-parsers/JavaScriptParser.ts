import { parseExpression, parse } from '@babel/parser';
import { Expression, isExpressionStatement } from '@babel/types';
import { CodeLanguageParser } from './CodeParser';

export interface ParsedJavaScript {
  ast: Expression;
  code: string;
  hasTrailingLineComment: boolean;
  lexemes: readonly { start: number; end: number }[];
}

/**
 * Parses JavaScript source and preserves the ranges needed for source edits.
 */
export class JavaScriptParser implements CodeLanguageParser<ParsedJavaScript> {
  readonly language = 'javascript';

  parse(source: string): ParsedJavaScript {
    let result: any;
    let ast: Expression;
    try {
      result = parseExpression(source, { allowAwaitOutsideFunction: true, tokens: true });
      ast = result;
    } catch (error) {
      // The statement parser also accepts a trailing semicolon and its comments.
      result = parse(source, { allowAwaitOutsideFunction: true, tokens: true });
      if (result.program.body.length !== 1 || !isExpressionStatement(result.program.body[0])) {
        throw error;
      }
      ast = result.program.body[0].expression;
    }
    const comment = result.comments?.[result.comments.length - 1];
    // Executable text excludes surrounding trivia and a trailing semicolon. Token offsets preserve
    // grouping parentheses, which Babel's expression node range may omit.
    const tokens = result.tokens.filter(
      (token: any) =>
        token.type !== 'CommentLine' &&
        token.type !== 'CommentBlock' &&
        token.end > token.start &&
        source.slice(token.start, token.end) !== ';'
    );
    return {
      ast,
      code: source.slice(tokens[0].start, tokens[tokens.length - 1].end),
      hasTrailingLineComment: comment?.type === 'CommentLine' && comment.end === source.length,
      lexemes: Object.freeze(tokens.map((token: any) => Object.freeze({ start: token.start, end: token.end })))
    };
  }
}
