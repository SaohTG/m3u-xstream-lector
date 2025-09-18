import { create } from 'zustand';
import { Playlist } from '@novastream/shared';

interface AppState {
  activePlaylist: Playlist | null | undefined; // undefined means not yet checked
  setActivePlaylist: (playlist: Playlist | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePlaylist: undefined,
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
}));
