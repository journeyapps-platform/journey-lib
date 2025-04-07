# @journeyapps/parser-schema

## 8.2.5

### Patch Changes

- f1f492c: Fix null pointer when accessing `displayFormat` on `ObjectType`
- Updated dependencies [d2e1526]
  - @journeyapps/evaluator@7.0.5
  - @journeyapps/parser-common@8.0.7

## 8.2.4

### Patch Changes

- Updated dependencies [9abb3f9]
  - @journeyapps/evaluator@7.0.4
  - @journeyapps/parser-common@8.0.6

## 8.2.3

### Patch Changes

- Updated dependencies [a68b965]
  - @journeyapps/evaluator@7.0.3
  - @journeyapps/parser-common@8.0.5

## 8.2.2

### Patch Changes

- Updated dependencies [16bb578]
  - @journeyapps/evaluator@7.0.2
  - @journeyapps/parser-common@8.0.4

## 8.2.1

### Patch Changes

- Updated dependencies [30aa390]
  - @journeyapps/evaluator@7.0.1
  - @journeyapps/parser-common@8.0.3

## 8.2.0

### Minor Changes

- 1d90a5f: Add custom mimetype for .exp files

## 8.1.0

### Minor Changes

- 2260401: Feature: Add `Param` and `Function` types used for view and template-def paramaters

### Patch Changes

- fe96da7: Repo upgrade - bump node version, migrate unit test to `vitest` and improve consistancy with `tsconfig`
- Updated dependencies [2260401]
- Updated dependencies [fe96da7]
  - @journeyapps/evaluator@7.0.0
  - @journeyapps/parser-common@8.0.2
  - @journeyapps/core-xml@5.0.4

## 8.0.4

### Patch Changes

- cc89366: Version bump hotfix
- Updated dependencies [cc89366]
  - @journeyapps/core-xml@5.0.3
  - @journeyapps/evaluator@6.2.4
  - @journeyapps/parser-common@8.0.1

## 8.0.3

### Patch Changes

- Updated dependencies [a047ac1]
  - @journeyapps/parser-common@8.0.0

## 8.0.2

### Patch Changes

- b6b32fb: Add `transform-value` to param parser definition

## 8.0.1

### Patch Changes

- 0d76e5a: Rename `provide-value` -> `transform-value` for view param

## 8.0.0

### Major Changes

- 129cebb: Refactor types and PrimitiveTypes, moving away from `protoype` inheritance and introducing type factories on `Schema.ts` and extending this in `@journeyapps/db` to register extended types.

### Patch Changes

- Updated dependencies [a4db92f]
  - @journeyapps/parser-common@7.2.3
  - @journeyapps/evaluator@6.2.3
  - @journeyapps/core-xml@5.0.2
