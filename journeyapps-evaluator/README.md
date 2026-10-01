# Journey Evaluator

`@ja-platform/evaluator` parses Journey expressions, preserves their source tokens, and evaluates them through a supplied scope. JavaScript code is parsed with Babel; the host supplies its execution behavior.

## Expression types

| Expression | Example source | Use |
| --- | --- | --- |
| `ConstantExpression<T>` | `42`, `true`, `null`, `'hello'` | A typed literal value. Read the value with `value()` and reproduce its syntax with `stringify()`. |
| `PrimitiveConstantExpression<T>` | `42`, `false` | A number or boolean constant. `NumericConstantExpressionParser` specializes parsing for numeric attributes. |
| `TextExpression` | `hello`, `'hello'` | A constant string. `TextExpressionParser` decodes quoted literals; `RawTextExpressionParser` preserves input exactly as text. |
| `ShorthandExpression` | `user.name`, `items[0].name` | A reference resolved through the scope. Bare function calls and arithmetic are not shorthand references. |
| `FormatShorthandExpression` | `price:.2f` | A shorthand reference with a format specifier, commonly used inside `{price:.2f}`. |
| `EvaluatedExpression` | `$:count + 1`, `$:true`, `$:{thing: 'other'}` | Explicitly evaluated code. Its code token contains the language's syntax tree. |
| `FunctionExpression` | `$:getGreeting(true)` | An evaluated expression whose body is a function call. Provides call-specific inspection and argument edits. |
| `FormatStringExpression` | `Hello {user.name}, {$:getGreeting(true)}` | Text mixed with typed placeholder expressions. `tokens` contains the complete source sequence; `parameters` exposes the placeholder expressions. Plain text is also a valid format string. |

`AbstractExpression` is the shared base. Every expression owns source tokens and supports `stringify()`, `clone()`, `isValid()`, and `evaluatePromise(scope)`.

`TextExpression` and `PrimitiveConstantExpression` extend `ConstantExpression`. `FunctionExpression` extends `EvaluatedExpression`, and `FormatShorthandExpression` extends `ShorthandExpression`.

Null literals use `ConstantExpression<null>`; there is no separate null expression class. Field parsers determine whether null is accepted.

Executable code requires `$:`. Arrays, objects, and conditional expressions live inside the code token's Babel AST; they do not have separate Journey expression classes. A shorthand such as `user.name` can omit the prefix because it identifies a value to retrieve.

## Parsing

Choose a parser according to the syntax the field accepts. Each expression's static `parse()` method is a convenience around its corresponding parser.

```ts
import {
  CombinedParser,
  EvaluatedExpression,
  EvaluatedExpressionParser,
  FunctionExpressionParser,
  PrimitiveConstantExpression,
  NumericConstantExpressionParser
} from '@ja-platform/evaluator';

const numberParser = new CombinedParser<
  EvaluatedExpression | PrimitiveConstantExpression<number>
>([
  new FunctionExpressionParser(),
  new EvaluatedExpressionParser(),
  new NumericConstantExpressionParser()
]);

numberParser.tryParse('$:count()');    // FunctionExpression
numberParser.tryParse('$:count + 1');  // EvaluatedExpression
numberParser.tryParse('42');          // PrimitiveConstantExpression<number>
numberParser.tryParse('hello');       // null
```

`CombinedParser` tries parsers in order and returns the first match. Put specific parsers before broader ones: function calls are also evaluated expressions, and a raw text parser matches any remaining input.

`tryParse()` returns `null` for unrecognized syntax but can throw for malformed syntax belonging to that parser. Static `parse()` requires a match and throws if none is found. Directly constructed or edited expressions can be checked with `isValid()`.

Constructors require prepared `tokens` and a resolved `expression` value; they do not parse source or create fallback tokens. Use `parse()` for source syntax, and `deserialize()` on constant expressions for existing values:

```ts
TextExpression.parse("'hello'"); // Decode a quoted source literal
TextExpression.deserialize('hello'); // Create a string value with a quoted literal token
PrimitiveConstantExpression.deserialize(false); // Create a boolean value and its literal token
```

## Format strings and source tokens

```ts
import { FormatStringExpression } from '@ja-platform/evaluator';

const expression = FormatStringExpression.parse(
  'Hello {user.name}, {$:getGreeting(true)}'
);

expression.tokens; // TextToken, PlaceholderToken, TextToken, PlaceholderToken
expression.parameters; // ShorthandExpression, FunctionExpression
expression.stringify(); // The original source, including braces and whitespace
```

The token structure is:

```text
FormatStringExpression
├── TextToken("Hello ")
├── PlaceholderToken
│   └── ShorthandExpression
│       └── JSToken("user.name", Babel AST)
├── TextToken(", ")
└── PlaceholderToken
    └── FunctionExpression
        ├── PrefixToken("$:")
        └── JSToken("getGreeting(true)", Babel AST)
```

`stringify()` joins each token's source representation. It preserves delimiters and escapes; it does not evaluate placeholders. Use `evaluatePromise(scope)` to resolve references and code through a `FormatStringScope`. Double braces, such as `{{user.name}}`, represent literal braces in the rendered text.

## Code parsing and editing

`CodeToken` defines the language-neutral contract for call and reference classification, call inspection, editing, and reference rewriting. `JSToken` supplies the JavaScript implementation and Babel AST. Argument representations belong to the language implementation; use `expression.code.sourceOf(argument)` to read their source. JavaScript arguments remain Babel nodes, accessible through `JSToken` when AST inspection is needed. Use `withArguments()` for Journey expression inputs or `withArgumentSources()` for source in the token's language.

`CodeToken.rewriteReferences()` exposes unbound references and direct calls through `CodeReference`, with source tokens for call arguments. Its JavaScript implementation preserves local bindings and source formatting.

`CodeParser` caches parsing by language and source through a singleton on `globalThis`. Each occurrence receives an independent tree and offsets. Call `CodeParser.getInstance().clear()` after a parsing batch to release cached results without affecting existing expressions.
