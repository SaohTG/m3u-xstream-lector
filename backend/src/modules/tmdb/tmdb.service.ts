import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TmdbService {
  private apiKey = process.env.TMDB_API_KEY;

  async findPoster(query: string): Promise<string | undefined> {
    try {
      if (!this.apiKey || !query) return undefined;
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
      const res = await axios.get(url);
      const first = res.data?.results?.[0];
      if (first?.poster_path) {
        return `https://image.tmdb.org/t/p/w500${first.poster_path}`;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}
