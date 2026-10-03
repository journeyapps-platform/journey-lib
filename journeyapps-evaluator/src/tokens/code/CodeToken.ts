import { AbstractToken } from '../AbstractToken';

/**
 * An unbound reference or direct call, independent of a language's syntax tree.
 */
export interface CodeReference {
  /**
   * The name resolved outside the code's local bindings.
   */
  readonly name: string;
  /**
   * Whether the reference is a direct call rather than a value lookup.
   */
  readonly isCall: boolean;
  /**
   * Call argument source tokens, including any nested reference replacements.
   * Value references have no arguments.
   */
  readonly arguments: readonly AbstractToken[];
}

/**
 * Original source and executable code for a language-specific token.
 * Subclasses own their parser and syntax tree.
 * Argument describes that language's argument representation; consumers can use
 * sourceOf() to read its source without inspecting the language's syntax tree.
 */
export abstract class CodeToken<Argument = unknown> extends AbstractToken {
  /**
   * Preserve the original source and its position in the surrounding expression.
   */
  protected constructor(readonly source: string, start = 0) {
    super(start);
  }

  /**
   * Executable source supplied to the evaluator, without surrounding source trivia.
   */
  abstract readonly code: string;
  /**
   * Arguments of the root call. Requires isCallExpression() to be true.
   */
  abstract readonly arguments: readonly Argument[];

  /**
   * Whether the root expression is a function call.
   *
   * @example
   * ```ts
   * new JSToken('save(true)').isCallExpression(); // true
   * new JSToken('ready ? save() : null').isCallExpression(); // false
   * ```
   */
  abstract isCallExpression(): boolean;

  /**
   * Whether the root expression identifies a value that can be resolved as shorthand.
   *
   * @example
   * ```ts
   * new JSToken('user.name').isReferenceExpression(); // true
   * new JSToken('count + 1').isReferenceExpression(); // false
   * ```
   */
  abstract isReferenceExpression(): boolean;

  /**
   * Source of the root call's target. Requires isCallExpression() to be true.
   *
   * @example
   * ```ts
   * new JSToken('worker.save(true)').functionName(); // 'worker.save'
   * ```
   */
  abstract functionName(): string;

  /**
   * Original source for an argument belonging to this token, including its delimiters.
   *
   * @example
   * ```ts
   * const token = new JSToken('save((count + 1), true)');
   * token.arguments.map((argument) => token.sourceOf(argument));
   * // ['(count + 1)', 'true']
   * ```
   */
  abstract sourceOf(argument: Argument): string;

  /**
   * Return a new token with the root call's target replaced by the supplied source.
   * Requires isCallExpression() to be true; leaves this token unchanged.
   *
   * @example
   * ```ts
   * const token = new JSToken('save(true)');
   * token.withName('worker.persist').raw(); // 'worker.persist(true)'
   * token.raw(); // 'save(true)'
   * ```
   */
  abstract withName(name: string): CodeToken<Argument>;

  /**
   * Return a new token with the root call's arguments replaced by language-specific source.
   * Requires isCallExpression() to be true; leaves this token unchanged.
   *
   * @example
   * ```ts
   * new JSToken('save(true)').withArguments(['user.name', 'false']).raw();
   * // 'save(user.name, false)'
   * ```
   */
  abstract withArguments(args: readonly string[]): CodeToken<Argument>;

  /**
   * Return a new token after rewriting unbound references and direct calls.
   * Return null from the callback to keep a reference unchanged. Replacement code
   * must be valid in this token's language and is not visited again.
   *
   * @example
   * ```ts
   * const token = new JSToken('user.name + count');
   * const rewritten = token.rewriteReferences((reference) => {
   *   if (reference.name === 'count' && !reference.isCall) {
   *     return new JSToken('state.total');
   *   }
   *   return null;
   * });
   * rewritten.raw(); // 'user.name + state.total'
   * ```
   */
  abstract rewriteReferences(rewrite: (reference: CodeReference) => CodeToken | null): CodeToken<Argument>;

  /**
   * Copy this token with an independent syntax tree and the same source position.
   */
  abstract clone(): CodeToken<Argument>;

  /**
   * Reproduce the original source, including surrounding whitespace and comments.
   */
  raw(): string {
    return this.source;
  }
}
