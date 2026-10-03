import { LocationType as SchemaLocationType } from '@ja-platform/parser-schema';
import { Location } from '../Location';
import { DBTypeMixin } from '../Type';

export class LocationType extends DBTypeMixin(SchemaLocationType) {
  valueFromJSON(value: any) {
    if (Array.isArray(value)) {
      if (value.length < 6) {
        throw new Error(
          'Location array format must have 6 parts, namely [latitude, longitude, altitude, horizontal_accuracy, vertical_accuracy, timestamp]'
        );
      }
      // Array format
      const data = {
        latitude: value[0],
        longitude: value[1],
        altitude: value[2],
        horizontal_accuracy: value[3],
        vertical_accuracy: value[4],
        timestamp: value[5]
      };
      return new Location(data);
    } else {
      // Object format
      return new Location(value);
    }
  }

  cast(value: any) {
    if (value instanceof Location) {
      return value;
    } else if (typeof value == 'object') {
      return new Location(value);
    } else {
      throw new Error(value + ' is not a valid location');
    }
  }

  clone(value: any) {
    return new Location(value);
  }
}
