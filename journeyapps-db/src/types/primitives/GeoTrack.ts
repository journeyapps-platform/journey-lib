import { DBTypeMixin } from '../Type';
import { GeoTrackType as SchemaGeoTrackType } from '@ja-platform/parser-schema';

export class GeoTrackType extends DBTypeMixin(SchemaGeoTrackType) {}
