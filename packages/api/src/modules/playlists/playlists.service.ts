import { Injectable } from '@nestjs/common';
@Injectable()
export class PlaylistsService {
  async link(body: any) {
    // Stub: accepter M3U ou XTREAM et retourner un id fictif
    const id = 'mock-' + Math.random().toString(36).slice(2, 8);
    return { playlistId: id, status: 'PENDING' };
  }
}
