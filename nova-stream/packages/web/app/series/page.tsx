import { getSeries } from "@/lib/api";
import { Rail } from "@/components/Rail";
import { getActivePlaylist } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SeriesPage() {
    const activePlaylist = await getActivePlaylist();

    if (!activePlaylist) {
        return (
            <div className="container mx-auto flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
                <h2 className="text-2xl font-semibold">No Active Playlist</h2>
                <p className="text-muted-foreground">Please link a playlist in the settings to see your series.</p>
                <Button asChild>
                    <Link href="/settings">Go to Settings</Link>
                </Button>
            </div>
        )
    }

    const series = await getSeries();

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Series</h1>
            {series.length > 0 ? (
                <Rail title="All Series" items={series} type="series" />
            ) : (
                <p className="text-muted-foreground">No series found in your current playlist.</p>
            )}
        </div>
    );
}
