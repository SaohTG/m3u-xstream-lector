import { create } from 'zustand';

type PlayerState = { url?: string; setUrl: (u?: string)=>void };
export const usePlayer = create<PlayerState>((set)=> ({
  url: undefined,
  setUrl: (u)=> set({ url: u })
}));
