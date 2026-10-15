import { AbstractObjectTypeFactory } from '../schema/TypeFactory';
import { SchemaModelType } from './SchemaModelType';

export class Relationship {
  static readonly TYPE = 'relationship';

  /** one-to-many, many-to-many, one-to-one */
  type: string;

  /** local object type (containing the belongs_to) */
  objectType: SchemaModelType; // TODO

  /** foreign object type (containing the has_many) */
  foreignType: SchemaModelType; // TODO

  /** The name used on the local object to identify the relationship (singular) */
  name: string;

  /** The name used on the foreign object to identify the relationship (plural) */
  foreignName: string;

  constructor() {
    this.type = 'one-to-many';

    this.objectType = null;
    this.foreignType = null;

    this.name = null;
    this.foreignName = null;
  }
}

export class RelationshipTypeFactory extends AbstractObjectTypeFactory<Relationship> {
  constructor() {
    super(Relationship.TYPE);
  }

  generate(): Relationship {
    return new Relationship();
  }
}
