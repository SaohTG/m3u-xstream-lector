import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Episode } from "@novastream/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function groupEpisodesBySeason(episodes: Episode[]): Record<number, Episode[]> {
    return episodes.reduce((acc, episode) => {
        const season = episode.season || 1;
        if (!acc[season]) {
            acc[season] = [];
        }
        acc[season].push(episode);
        // Sort episodes within the season
        acc[season].sort((a, b) => (a.episode || 0) - (b.episode || 0));
        return acc;
    }, {} as Record<number, Episode[]>);
}
