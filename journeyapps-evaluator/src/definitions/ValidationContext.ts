import type { ReferencePath } from '../tokens';
import type { Type } from '@ja-platform/types';

/**
 * Resolve declared references for expression validation without reading or evaluating values.
 */
export interface ValidationContext {
  getReference(path: ReferencePath): Type | null;
}
