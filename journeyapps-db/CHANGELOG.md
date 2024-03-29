# @journeyapps/db

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
