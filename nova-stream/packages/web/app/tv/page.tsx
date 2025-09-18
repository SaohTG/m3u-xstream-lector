import { getLiveChannels } from "@/lib/api";
import { redirect } from "next/navigation";
import { getActivePlaylist } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TvPageClient } from "./TvPageClient";


export default async function TvPage() {
    const activePlaylist = await getActivePlaylist();

    if (!activePlaylist) {
        return (
            <div className="container mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
                <h2 className="text-2xl font-semibold">No Active Playlist</h2>
                <p className="text-muted-foreground">Please link a playlist in the settings to see your channels.</p>
                <Button asChild>
                    <Link href="/settings">Go to Settings</Link>
                </Button>
            </div>
        )
    }

    const channels = await getLiveChannels();

    return <TvPageClient channels={channels} />;
}
