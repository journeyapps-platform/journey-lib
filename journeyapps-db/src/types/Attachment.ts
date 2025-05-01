import 'isomorphic-fetch';

const STATE = {
  UPLOADED: 'uploaded',
  PENDING: 'pending'
};

export const toBackendData = Symbol('AttachmentToBackendData');

export class Attachment {
  static isAttachment(attachment: unknown): attachment is Attachment {
    if (attachment == null) {
      return false;
    } else if (attachment instanceof Attachment) {
      return true;
    } else if (
      typeof (attachment as Attachment).id == 'string' &&
      typeof (attachment as Attachment).present == 'function'
    ) {
      return true;
    }
    return false;
  }

  static async create(options: {
    filename?: string;
    mediaType?: string;
    base64?: string;
    text?: string;
    data?: ArrayBuffer | Uint8Array;
  }): Promise<Attachment> {
    const attachment = new Attachment({ id: null, state: STATE.PENDING, urls: {} });
    attachment.data = toBuffer(options);
    attachment.filename = options.filename;
    return attachment;
  }

  id: string;
  state: string;
  urls: { [index: string]: string };

  private data?: Buffer;
  private filename?: string;

  private _urlKey: string; // tslint:disable-line

  constructor(attrs: string | { id?: string; state?: string; urls?: { [index: string]: string } }) {
    attrs = attrs || {};
    this._urlKey = 'original';
    if (typeof attrs == 'string') {
      this.id = attrs;
      this.state = STATE.PENDING;
      this.urls = {};
    } else {
      this.id = attrs.id || undefined;
      this.state = attrs.state;
      this.urls = attrs.urls;
    }
  }

  toString() {
    return this.id;
  }

  /**
   * Returns a processed version of the attachment.
   *
   * If the specified process does not exist, present() will return false on the returned Attachment.
   *
   * @param process 'original', 'fullscreen' or 'thumbnail'.
   */
  processed(process: string) {
    var clone = new Attachment(this);
    clone._urlKey = process;
    return clone;
  }

  /**
   * An attachment is present if its data is available.
   *
   * This can be either:
   * 1. An attachment created and uploaded by a different client.
   * 2. An attachment created locally, which may not be uploaded yet.
   *
   * @returns true if the attachment is present
   */
  present() {
    if (this.data) {
      return true;
    }
    return this.state == STATE.UPLOADED && this.url() != null;
  }

  /**
   * @returns true if the attachment is uploaded, either locally or by a different client.
   */
  uploaded() {
    return this.state == STATE.UPLOADED && this.url() != null;
  }

  /**
   * Return the object as JSON, in the same format as given by the v4 API, with an additional `id` field.
   */
  toJSON() {
    return Object.assign(
      {
        id: this.id,
        state: this.state
      },
      this.urls
    );
  }

  /**
   * Returns a the default downloadable URL for the attachment.
   *
   * For different variations of image attachments, use for example:
   *    attachment.processed('thumbnail').url();
   *
   * @return the URL, or null if not present
   */
  url() {
    return this.urls[this._urlKey];
  }

  /**
   * Downloads the attachment data as a Buffer.
   *
   * Not available on mobile devices.
   *
   * @returns the data as a Buffer
   * @throws an error if the attachment is not present, or a network error occurs.
   */
  async toBuffer(): Promise<Buffer> {
    if (this.data) {
      return this.data;
    }
    if (!this.present()) {
      throw new Error('Attachment is not present');
    }
    const response: Response = await fetch(this.url());
    if (!response.ok) {
      throw new Error('Attachment fetch failed: ' + response.statusText);
    }

    if(typeof (response as any).buffer == 'function'){
      // buffer() is present on node-fetch Response, but not the standard fetch Response.
      this.data = (response as any).buffer();
      return this.data;
    }

    const arrayBuffer = await response.arrayBuffer();
    this.data = Buffer.from(arrayBuffer);

    return this.data;
  }

  /**
   * Downloads the attachment data as a ArrayBuffer.
   *
   *
   * @returns the data as an ArrayBuffer.
   * @throws an error if the attachment is not present, or a network error occurs.
   */
  async toArrayBuffer(): Promise<ArrayBuffer> {
    const data: Buffer = await this.toBuffer();
    const arrBuf: ArrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.length)as ArrayBuffer;
    return arrBuf
  }

  /**
   * Downloads the attachment data as a string.
   *
   * Only use for text-based data, e.g. a CSV attachment.
   *
   * UTF-8 encoding is assumed.
   *
   * @returns the data as a string
   * @throws an error if the attachment is not present, or a network error occurs.
   */
  async toText(): Promise<string> {
    const data = await this.toBuffer();
    return data.toString('utf8');
  }

  /**
   * Downloads the attachment data as base64-encoded string.
   *
   * @returns the data
   * @throws an error if the attachment is not present, or a network error occurs.
   */
  async toBase64(): Promise<string> {
    const data = await this.toBuffer();
    return data.toString('base64');
  }

  [toBackendData](): any {
    if (this.id != null) {
      return { id: this.id };
    } else if (this.data) {
      return {
        base64: this.data.toString('base64'),
        filename: this.filename
      };
    } else {
      throw new Error('Invalid attachment');
    }
  }
}

function toBuffer(options: { base64?: string; text?: string; data?: ArrayBuffer | Uint8Array }): Buffer {
  if (options.data) {
    if (Buffer.isBuffer(options.data)) {
      return options.data;
    }

    if (options.data instanceof ArrayBuffer || options.data instanceof Uint8Array) {
      return Buffer.from(options.data as Uint8Array);
    }

    throw new Error('Invalid argument for "data"');
  }

  if (options.text) {
    return Buffer.from(options.text, 'utf8');
  }

  if (options.base64) {
    return Buffer.from(options.base64, 'base64');
  }

  throw new Error('Invalid Attachment data');
}
