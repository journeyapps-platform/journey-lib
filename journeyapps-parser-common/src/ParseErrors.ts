import { error, XMLPositional, ValidationError, ErrorType } from '@ja-platform/core-xml';
import { XMLError } from '@journeyapps/domparser/types';

export class ParseErrors {
  private errors: (ValidationError | XMLError)[];

  constructor() {
    this.errors = [];
  }

  pushError(element: XMLPositional, message: string, type?: ErrorType) {
    this.errors.push(error(element, message, type));
  }

  pushErrors(newErrors: (ValidationError | XMLError)[]) {
    for (let i = 0; i < newErrors.length; i++) {
      const err = newErrors[i];
      this.errors.push(err);
    }
  }

  reset() {
    this.errors = [];
  }

  getErrors() {
    return this.errors;
  }
}
