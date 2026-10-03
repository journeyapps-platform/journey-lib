import { TypeInterface } from '../definitions/TypeInterface';

/**
 * Format an expression with a specific format.
 */
export function formatValue(value: any, type: TypeInterface | null, format?: string | null): string {
  if (value == null) {
    return '';
  } else if (type != null) {
    return type.format(value, format ?? undefined);
  } else {
    // This should generally not happen. However, we still try to handle it gracefully.
    // This is useful for tests where we don't want to define the type for every variable.
    return value.toString();
  }
}

/**
 * Resolve an object's asynchronous display value before falling back to its type formatter.
 */
export async function formatValueAsync(
  value: any,
  type: TypeInterface | null,
  format?: string | null
): Promise<string> {
  let formatted: string;
  if (value != null && typeof value._display === 'function') {
    formatted = await value._display();
  } else {
    formatted = formatValue(value, type, format);
  }
  return formatted;
}

/**
 * Find the outer brace without interpreting braces in JavaScript strings, comments or regular expressions.
 * This scanner determines boundaries only; Babel parses the enclosed JavaScript.
 * start points at the opening brace. Return the closing brace's index, or -1 if no boundary is found.
 */
export function placeholderEnd(source: string, start: number): number {
  let depth = 1;
  let previous = '';
  const groups: string[] = [];
  let end = -1;
  for (let i = start + 1; i < source.length; ) {
    const char = source[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    // Comment contents cannot close a placeholder. An unfinished comment consumes the remaining source.
    if (source.startsWith('//', i)) {
      const newline = source.slice(i).search(/[\r\n]/);
      if (newline < 0) {
        break;
      }
      i += newline;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) {
        break;
      }
      i = end + 2;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      i = quotedEnd(source, i);
      previous = 'value';
      continue;
    }
    // A slash can start a regular expression or divide two values. The preceding syntax gives us
    // a likely interpretation; the expression parser verifies the resulting boundary with Babel.
    const regexp =
      char === '/' &&
      (!previous ||
        /^(?:return|throw|case|delete|typeof|void|new|in|instanceof|yield|await|else|do|control)$/.test(previous) ||
        (!/^[$_\p{ID_Start}\d]/u.test(previous) && ![')', ']', '}', '.', '?.', '++', '--'].includes(previous)) ||
        previous === '$:');
    if (regexp) {
      // Escaped slashes and slashes inside character classes do not end the regular expression.
      let inClass = false;
      i++;
      for (; i < source.length; i++) {
        if (source[i] === '\\') {
          i++;
          continue;
        }
        if (source[i] === '[') inClass = true;
        if (source[i] === ']') inClass = false;
        if (source[i] === '/' && !inClass) {
          i++;
          break;
        }
      }
      while (/[a-z]/i.test(source[i] ?? '') && i < source.length) i++;
      previous = 'value';
      continue;
    }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) {
      end = i;
      break;
    }
    // Remember whether each parenthesis group follows a control-flow keyword. After `if (...)`,
    // for example, a slash may start a regular expression statement rather than division.
    if (char === '(') groups.push(previous);
    const word = source.slice(i).match(/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/u);
    const punctuation = source.slice(i).match(/^(?:\$:|=>|&&|\|\||\?\?|\?\.|\+\+|--|[^\s])/u);
    previous = word?.[0] ?? punctuation[0];
    if (char === ')' && /^(?:if|while|for|with|switch|catch)$/.test(groups.pop() ?? '')) previous = 'control';
    i += word?.[0].length ?? punctuation[0].length;
  }
  return end;
}

/**
 * Return the offset just after a closing quote, or source.length for an unfinished quoted value.
 * start points at a single quote, double quote or backtick.
 */
export function quotedEnd(source: string, start: number): number {
  const quote = source[start];
  let end = source.length;
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++;
      continue;
    }
    if (source[i] === quote) {
      end = i + 1;
      break;
    }
    // Template interpolation can contain nested strings and templates, so scan its braces recursively.
    if (quote === '`' && source[i] === '$' && source[i + 1] === '{') {
      const placeholder = placeholderEnd(source, i + 1);
      if (placeholder < 0) {
        break;
      }
      i = placeholder;
    }
  }
  return end;
}
