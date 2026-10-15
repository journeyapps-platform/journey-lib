/**
 * Format a value with an optional format specifier.
 */
export interface Formatter {
  format(value: any, format?: string): string;
}
