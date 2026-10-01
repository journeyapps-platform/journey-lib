// From: https://github.com/Microsoft/TypeScript/issues/2536
import { ErrorType } from '@ja-platform/core-xml';

export const RESERVED_WORDS = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with'
];

// These currently appear to work fine as interface names.
// Listed here for reference only
export const STRICT_RESERVED_WORDS = [
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield'
];

// Some of these appear to work as interface names, but we blacklist them all.
export const CONTEXTUAL_KEYWORDS = [
  'any',
  'boolean',
  'constructor',
  'declare',
  'get',
  'module',
  'require',
  'number',
  'set',
  'string',
  'symbol',
  'type',
  'from',
  'of'
];

export const TYPE_BLACKLIST: Record<string, boolean> = {};

for (let key of CONTEXTUAL_KEYWORDS) {
  TYPE_BLACKLIST[key] = true;
}

for (let key of RESERVED_WORDS) {
  TYPE_BLACKLIST[key] = true;
}

const JOURNEY_RESERVED_NAMES = ['object', 'account', 'id', 'type'];
const JOURNEY_RESERVED_FIELD_NAMES = [...JOURNEY_RESERVED_NAMES, '_id', '_type', 'account_id', 'attribute'];

export function validateModelName(name: string): null | ErrorType {
  if (JOURNEY_RESERVED_NAMES.indexOf(name) >= 0) {
    return 'error';
  } else if (name in TYPE_BLACKLIST) {
    // These cause issues with TypeScript definitions, but are fine for regular JS.
    // To not force a migration of existing apps, we just mark this as a warning.
    return 'warning';
  }

  return null;
}

export function validateFieldName(name: string): null | ErrorType {
  if (JOURNEY_RESERVED_FIELD_NAMES.indexOf(name) >= 0) {
    return 'error';
  }
  return null;
}
