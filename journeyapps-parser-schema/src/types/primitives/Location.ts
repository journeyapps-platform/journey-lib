import { ObjectType, Type } from '@ja-platform/types';
import { TextType } from './Text';

export class LocationType extends ObjectType {
  static readonly TYPE = 'location';

  constructor() {
    super(LocationType.TYPE);
  }

  getField(name: string): Type | null {
    return ['latitude', 'longitude', 'altitude', 'horizontal_accuracy', 'vertical_accuracy'].includes(name)
      ? new TextType()
      : null;
  }
}
