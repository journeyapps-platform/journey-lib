import { Type } from '@ja-platform/types';

export class GeoTrackType extends Type {
  static readonly TYPE = 'track';

  constructor() {
    super(GeoTrackType.TYPE);
  }
}
