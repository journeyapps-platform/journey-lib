# @journeyapps/db

## 8.1.1

### Patch Changes

- 13d5227: Added support for non `node-fetch` responses

## 8.1.0

### Minor Changes

- fda55dc: Fix missing browser export for primative types

## 8.0.14

### Patch Changes

- d2e1526: Refactor `Batch`, `DatabaseObject` and `VariableFormatStringScope` to use `async` and return early.
- Updated dependencies [f1f492c]
- Updated dependencies [d2e1526]
  - @journeyapps/parser-schema@8.2.5
  - @journeyapps/evaluator@7.0.5
  - @journeyapps/parser-common@8.0.7

## 8.0.13

### Patch Changes

- Updated dependencies [9abb3f9]
  - @journeyapps/evaluator@7.0.4
  - @journeyapps/parser-common@8.0.6
  - @journeyapps/parser-schema@8.2.4

## 8.0.12

### Patch Changes

- Updated dependencies [a68b965]
  - @journeyapps/evaluator@7.0.3
  - @journeyapps/parser-common@8.0.5
  - @journeyapps/parser-schema@8.2.3

## 8.0.11

### Patch Changes

- Updated dependencies [16bb578]
  - @journeyapps/evaluator@7.0.2
  - @journeyapps/parser-common@8.0.4
  - @journeyapps/parser-schema@8.2.2

## 8.0.10

### Patch Changes

- Updated dependencies [30aa390]
  - @journeyapps/evaluator@7.0.1
  - @journeyapps/parser-common@8.0.3
  - @journeyapps/parser-schema@8.2.1

## 8.0.9

### Patch Changes

- Updated dependencies [1d90a5f]
  - @journeyapps/parser-schema@8.2.0

## 8.0.8

### Patch Changes

- fe96da7: Repo upgrade - bump node version, migrate unit test to `vitest` and improve consistancy with `tsconfig`
- Updated dependencies [2260401]
- Updated dependencies [fe96da7]
- Updated dependencies [2260401]
  - @journeyapps/evaluator@7.0.0
  - @journeyapps/parser-common@8.0.2
  - @journeyapps/parser-schema@8.1.0
  - @journeyapps/core-date@5.3.2
  - @journeyapps/core-xml@5.0.4

## 8.0.7

### Patch Changes

- 3cff3c6: Fix display format for `date` and `datetime`,where it would not use the fallback value when set to `null`

## 8.0.6

### Patch Changes

- cc89366: Version bump hotfix
- Updated dependencies [cc89366]
  - @journeyapps/core-date@5.3.1
  - @journeyapps/core-xml@5.0.3
  - @journeyapps/evaluator@6.2.4
  - @journeyapps/parser-common@8.0.1
  - @journeyapps/parser-schema@8.0.4

## 8.0.5

### Patch Changes

- Updated dependencies [a047ac1]
  - @journeyapps/parser-common@8.0.0
  - @journeyapps/parser-schema@8.0.3

## 8.0.4

### Patch Changes

- 2a7fa29: Fix `single-choice` and `single-choice-integer` types, serialization methods `valueToJSON` and `valueFromJSON`

## 8.0.3

### Patch Changes

- Updated dependencies [b6b32fb]
  - @journeyapps/parser-schema@8.0.2

## 8.0.2

### Patch Changes

- Updated dependencies [0d76e5a]
  - @journeyapps/parser-schema@8.0.1

## 8.0.1

### Patch Changes

- 06272c4: Fix `QueryType` in `journeyapps/db` cast and clone methods

## 8.0.0

### Major Changes

- 129cebb: Refactor types and PrimitiveTypes, moving away from `protoype` inheritance and introducing type factories on `Schema.ts` and extending this in `@journeyapps/db` to register extended types.

### Patch Changes

- Updated dependencies [129cebb]
- Updated dependencies [a4db92f]
- Updated dependencies [ad5c3dc]
  - @journeyapps/parser-schema@8.0.0
  - @journeyapps/parser-common@7.2.3
  - @journeyapps/evaluator@6.2.3
  - @journeyapps/core-xml@5.0.2
  - @journeyapps/core-date@5.3.0
