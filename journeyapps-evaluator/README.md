# Journey Evaluator

`@ja-platform/evaluator` parses Journey expressions, preserves their source tokens, and evaluates them through a supplied scope. JavaScript code is parsed with Babel; the host supplies its execution behavior.

## Expression types

| Expression                  | Example source                                | Use                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConstantExpression`        | `hello`, `42`, `false`, `"hello"`             | Text by default; an explicit value type can parse numbers or booleans. `raw()` always preserves source.                                                                              |
| `ShorthandExpression`       | `user.name`, `items[0].name`                  | A reference resolved through the scope. Bare function calls and arithmetic are not shorthand references.                                                                             |
| `FormatShorthandExpression` | `price:.2f`                                   | A shorthand reference with a format specifier, commonly used inside `{price:.2f}`.                                                                                                   |
| `EvaluatedExpression`       | `$:count + 1`, `$:true`, `$:{thing: 'other'}` | Explicitly evaluated code. Its code token contains the language's syntax tree.                                                                                                       |
| `FunctionExpression`        | `$:getGreeting(true)`                         | An evaluated expression whose body is a function call. Provides call-specific inspection and argument edits.                                                                         |
| `FormatStringExpression`    | `Hello {user.name}, {$:getGreeting(true)}`    | Text mixed with placeholder expressions. `tokens` contains the complete source sequence; `parameters` exposes the placeholder expressions. Plain text is also a valid format string. |

`AbstractExpression` is the shared base for source tokens and positions. Constants expose `.value()`, shorthand references expose `.path`, and evaluated expressions (including functions) expose `.code()` and `.codeToken`. `TextToken.decodedText` decodes doubled braces. The former `.text()`, expression/token `.stringify()`, and shared `.expression` field have been removed. Every expression owns source tokens and supports `raw()`, `clone()`, `isValid()`, and `evaluatePromise(scope)`.

`FunctionExpression` extends `EvaluatedExpression`, and `FormatShorthandExpression` extends `ShorthandExpression`.

Constants use an explicitly supplied value type. The consumer selects an explicit `ValueType<T>` to parse a typed value, without inferring a type from source. `TextType`, `NumberType`, and `BooleanType` can also parse dynamically resolved values. Number parsing rejects empty input, non-numeric values, and non-finite numbers. Boolean parsing accepts booleans, true/false text, and finite numeric values (zero is false). Attribute defaults, truthiness conditions, and range restrictions remain consumer policies.

Executable code requires `$:`. Arrays, objects, and conditional expressions live inside the code token's Babel AST; they do not have separate Journey expression classes. A shorthand such as `user.name` can omit the prefix because it identifies a value to retrieve.

## Parsing

Choose a parser according to the syntax the field accepts. Each expression's static `parse()` method is a convenience around its corresponding parser.

```ts
import {
  CombinedParser,
  EvaluatedExpression,
  EvaluatedExpressionParser,
  FunctionExpressionParser,
  ConstantExpression,
  ConstantExpressionParser
} from '@ja-platform/evaluator';

const attributeParser = new CombinedParser<EvaluatedExpression | ConstantExpression>([
  new FunctionExpressionParser(),
  new EvaluatedExpressionParser(),
  new ConstantExpressionParser()
]);

attributeParser.tryParse('$:count()'); // FunctionExpression
attributeParser.tryParse('$:count + 1'); // EvaluatedExpression
attributeParser.tryParse('42'); // ConstantExpression with value "42"
attributeParser.tryParse('false'); // ConstantExpression with value "false"
attributeParser.tryParse('hello'); // ConstantExpression with value "hello"
```

`CombinedParser` tries parsers in order and returns the first match. Put specific parsers before broader ones: function calls are also evaluated expressions, and the constant parser matches any remaining input. The default `parseExpression()` recognizes evaluated code and shorthand references first, then preserves unmatched input as constant text.

`ConstantExpressionParser` defaults to text, or accepts an explicit type: `new ConstantExpressionParser(NumberType)`. It replaces the text, raw-text, primitive and numeric constant parsers. One generic `ConstantExpression<T>` stores the typed value and original source tokens; no literal token or primitive subclasses are needed.

`ExpressionParser` is an abstract base with `.tryParse()` for optional matches and `.parse()` for required valid matches. Concrete parsers and `CombinedParser` inherit `.parse()`; expression static parse methods delegate to it.

Syntax-specific parsers return `null` for unrecognized syntax but can throw for malformed syntax belonging to that parser. A constant parser accepts the remaining syntax and throws if its selected type cannot parse the value. Static `parse()` requires a valid expression. Directly constructed or edited expressions can be checked with `isValid()`.

Constructors require prepared `tokens` and any type-specific options; they do not parse source or create fallback tokens. Use `ConstantExpression.parse(source, TextType)` for constant text. It also replaces the former `deserialize()` factories, which encoded typed literals:

```ts
ConstantExpression.parse('42', TextType).value(); // "42"
ConstantExpression.parse('045', NumberType).value(); // 45
ConstantExpression.parse('045', NumberType).raw(); // "045"
ConstantExpression.parse('false', BooleanType).value(); // false
NumberType.parse('45'); // 45, also usable for resolved values
ConstantExpression.parse('45px', NumberType); // throws SyntaxError
ConstantExpression.parse('false', TextType).value(); // "false"
ConstantExpression.parse('null', TextType).value(); // "null"
ConstantExpression.parse('"hello"', TextType).value(); // '"hello"'
```

Constant parsing does not quote or escape text. When editing function arguments, supply valid source in the code token's language through `withArgumentSources()` or `withArguments()`. For example, `withArgumentSources(['"hello"', 'false'])` inserts a JavaScript string and boolean into a JavaScript call. The JavaScript code token owns their syntax tree.

## Format strings and source tokens

```ts
import { FormatStringExpression } from '@ja-platform/evaluator';

const expression = FormatStringExpression.parse('Hello {user.name}, {$:getGreeting(true)}');

expression.tokens; // TextToken, PlaceholderToken, TextToken, PlaceholderToken
expression.parameters; // ShorthandExpression, FunctionExpression
expression.raw(); // The original source, including braces and whitespace
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

Constant placeholders preserve their text when rendered: `{null}` renders `null`, and `{"hello"}` renders `"hello"`.

`raw()` joins each token's source representation. It preserves delimiters and escapes; it does not evaluate placeholders. Use `evaluatePromise(scope)` to resolve references and code through a `FormatStringScope`. Double braces, such as `{{user.name}}`, represent literal braces in the rendered text.

## Code parsing and editing

`CodeToken` defines the language-neutral contract for call and reference classification, call inspection, editing, and reference rewriting. `JSToken` supplies the JavaScript implementation and Babel AST. Argument representations belong to the language implementation; use `expression.code.sourceOf(argument)` to read their source. JavaScript arguments remain Babel nodes, accessible through `JSToken` when AST inspection is needed. Use `withArguments()` for Journey expression source or `withArgumentSources()` for source in the token's language.

`CodeToken.rewriteReferences()` exposes unbound references and direct calls through `CodeReference`, with source tokens for call arguments. Its JavaScript implementation preserves local bindings and source formatting.

`CodeParser` caches parsing by language and source through a singleton on `globalThis`. Each occurrence receives an independent tree and offsets. Call `CodeParser.getInstance().clear()` after a parsing batch to release cached results without affecting existing expressions.
