import { HttpException, HttpStatus } from '@nestjs/common';

export class PlaylistValidationException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class PlaylistNotFoundException extends HttpException {
  constructor(message = 'Playlist not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class StreamNotFoundException extends HttpException {
    constructor(message = 'Stream not found') {
      super(message, HttpStatus.NOT_FOUND);
    }
}
