---
'@journeyapps/evaluator': major
'@journeyapps/parser-schema': patch
'@journeyapps/db': patch
---

Separate source tokens from evaluatable expressions inside the evaluator. AbstractToken supports source trees and recursive stringify(). TextToken preserves literal format text, PrefixToken owns the function prefix, and JSToken retains original JavaScript source alongside Babel's AST. PlaceholderToken contains a typed expression and owns its braces.

Rename the expression classes and parser to remove Token from their names. AbstractExpression owns its tokens; FormatStringExpression owns text and placeholder tokens and exposes placeholder expressions through parameters. Constant expressions expose typed values. Replace escape() with stringify() and tokenEvaluatePromise() with evaluatePromise().

Remove the separate token package, generic grammar engine, source transformers and Babel-to-Journey conversion factories. Function arguments, array elements, object properties and conditional branches remain Babel nodes rather than a duplicate expression tree. Keep typed parse() entry points and source-preserving expression replacements. Update Journey Lib's schema and database imports for the new expression API.

Represent arbitrary prefixed code with EvaluatedExpression, directly extending AbstractExpression. FunctionExpression specializes EvaluatedExpression for JavaScript calls only and owns call-specific accessors and edits. Arrays, objects and conditionals stay in Babel’s AST. Remove the unprefixed JavaScript expression fallback; executable code requires $:, including in format-string placeholders.

Introduce CodeToken as the language-neutral source contract, with JSToken supplying Babel parsing and JavaScript call edits. EvaluatedExpression accepts custom code-token subclasses; string input defaults to JavaScript.

Replace the singleton expression dispatcher and parsing contexts with an ExpressionParser interface and an ordered CombinedParser. Keep parsing on each expression's colocated parser; static parse() methods only require a successful tryParse(). Placeholder braces are parsed exclusively by the format-string parser. Store constant source and values in passive LiteralToken instances, using simple checks for numbers, booleans and null and Babel for quoted JavaScript string decoding.

Remove unused expression type guards, the internal token setter, obsolete object-reference interfaces, and dependencies left over from the previous parser. Remove FunctionExpression’s redundant call-classification method; its valid instances represent calls.

Remove mixed-input format-string assembly via fromParts(); assemble TextToken and PlaceholderToken instances directly. Function argument edits accept either an expression array through withArguments() or a source-string array through withArgumentSources(). JSToken argument edits accept source strings only.

Consolidate constant parsing into ConstantExpressionParser.tryParse(); typed constant parsers reuse its value and source tokens. Remove empty expression option interfaces in favor of AbstractExpressionOptions and remove the single-use JavaScript token-array wrapper.

Add isValid() to expressions and move constructor type checks into explicit validation. Preserve malformed source for inspection and preserve validity when cloning. Parsers and static parse() continue enforcing syntax, while edited or directly constructed expressions can be checked without constructor validation exceptions.

Cache bounded code parse results by language and source in a CodeParser singleton stored on globalThis, injecting JavaScriptParser for Babel parsing, keeping token offsets and mutable ASTs independent. Expose CodeParser.getInstance().clear() so callers can release cached results after a parsing batch without affecting existing expressions.

Add JSToken.rewriteReferences() for scope-aware replacement of unbound variables and direct calls. Keep Babel traversal inside the evaluator, expose source tokens to replacement callbacks, preserve local bindings and property names, and retain source formatting and replacement precedence.
