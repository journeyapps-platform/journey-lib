/**
 * Language-specific parsing injected into the shared code parser.
 * Results must support structuredClone; language identifies the grammar used for cache entries.
 */
export interface CodeLanguageParser<T> {
  readonly language: string;
  parse(source: string): T;
}

/**
 * Shared code parsing and caching, independent of the language's syntax tree.
 */
export class CodeParser {
  static getInstance(): CodeParser {
    const globals = globalThis as typeof globalThis & {
      __journeyappsCodeParser?: CodeParser;
    };
    // Use the runtime global so separate evaluator bundles share the same cache owner.
    if (!globals.__journeyappsCodeParser) {
      globals.__journeyappsCodeParser = new CodeParser();
    }
    return globals.__journeyappsCodeParser;
  }

  private readonly cache = new Map<string, unknown>();
  private readonly limit = 256;

  private constructor() {}

  /**
   * Releases cached results without affecting existing tokens.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Reuses language parsing by exact source, returning an independent tree for each occurrence.
   */
  parse<T>(source: string, parser: CodeLanguageParser<T>): T {
    // Include the language so identical source in different grammars cannot share a parse result.
    const key = JSON.stringify([parser.language, source]);
    if (!this.cache.has(key)) {
      const parsed = parser.parse(source);
      // Bound retained trees even when callers do not explicitly clear their parsing batch.
      if (this.cache.size === this.limit) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, parsed);
    }
    // Never expose the cached tree, even on a miss: edits to a token must not affect later parses.
    return structuredClone(this.cache.get(key) as T);
  }
}
