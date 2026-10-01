---
'@ja-platform/evaluator': major
'@ja-platform/parser-schema': patch
'@ja-platform/db': patch
---

Rework the evaluator around separate source tokens and typed expressions. This is a breaking API change; schema and database consumers are updated accordingly.

- Rename expression classes to remove `Token` from their names and use `AbstractExpression` as their shared base. Replace `escape()` with `stringify()` and `tokenEvaluatePromise()` with `evaluatePromise()`.
- Preserve complete source token sequences, including whitespace, delimiters and escapes. Format strings own text and placeholder tokens, with typed placeholder expressions exposed through `parameters`.
- Require `$:` for executable code. `EvaluatedExpression` represents arbitrary prefixed code; `FunctionExpression` specializes it for calls. Shorthand references remain available without a prefix.
- Use Babel ASTs for JavaScript function arguments, arrays, objects and conditionals instead of separate Journey expression trees. `CodeToken` provides the language-neutral contract, implemented by `JSToken` for JavaScript.
- Replace the shared expression dispatcher with per-expression parsers and an ordered `CombinedParser`. Static `parse()` methods require a match; `tryParse()` returns null for unrecognized syntax and throws for malformed matching syntax.
- Move constructor validation to explicit `isValid()` checks. Assemble format strings with text and placeholder tokens, and edit function arguments through `withArguments()` or `withArgumentSources()` instead of mixed input APIs.
- Add shared code parsing caches through `CodeParser` and scope-aware JavaScript reference rewriting through `JSToken.rewriteReferences()`. Call `CodeParser.getInstance().clear()` to release cached results after a parsing batch.

See the evaluator README for expression types, syntax examples and parsing guidance.
