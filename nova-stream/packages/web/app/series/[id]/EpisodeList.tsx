'use client';

import { Episode } from "@novastream/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface EpisodeListProps {
    seasons: Record<number, Episode[]>;
    seriesId: string;
}

export function EpisodeList({ seasons, seriesId }: EpisodeListProps) {
    const params = useParams<{ season: string, episode: string }>();
    const seasonKeys = Object.keys(seasons).sort((a,b) => Number(a) - Number(b));

    if (seasonKeys.length === 0) {
        return <p className="p-4 text-muted-foreground">No episodes found.</p>
    }

    return (
        <Tabs defaultValue={`season-${params.season || seasonKeys[0]}`} className="flex-1 flex flex-col">
            <TabsList className="m-2">
                {seasonKeys.map(seasonNum => (
                    <TabsTrigger key={seasonNum} value={`season-${seasonNum}`}>Season {seasonNum}</TabsTrigger>
                ))}
            </TabsList>
            <ScrollArea className="flex-1">
                {seasonKeys.map(seasonNum => (
                    <TabsContent key={seasonNum} value={`season-${seasonNum}`} className="m-0">
                        <div className="flex flex-col">
                            {seasons[Number(seasonNum)].map(episode => (
                                <Link
                                    href={`/series/${seriesId}/season/${seasonNum}/episode/${episode.episode}`}
                                    key={episode.id}
                                    className={cn(
                                        "p-3 border-b hover:bg-accent",
                                        String(episode.episode) === params.episode && "bg-accent font-semibold"
                                        )}
                                >
                                    <p className="truncate">E{episode.episode} - {episode.title}</p>
                                </Link>
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </ScrollArea>
        </Tabs>
    );
}
