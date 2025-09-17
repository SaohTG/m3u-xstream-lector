import { getSeriesDetails, getStreamUrl } from "@/lib/api";
import { PlayerHLS } from "@/components/PlayerHLS";
import { notFound } from "next/navigation";

interface EpisodePageParams {
    id: string;
    season: string;
    episode: string;
}

export default async function EpisodePage({ params }: { params: EpisodePageParams }) {
    const series = await getSeriesDetails(params.id).catch(() => notFound());
    const episodeData = series.episodes.find(e => String(e.season) === params.season && String(e.episode) === params.episode);

    if (!episodeData) {
        notFound();
    }

    const streamInfo = await getStreamUrl('series', params.id, episodeData.id).catch(() => null);

    if (!streamInfo?.url) {
        return (
            <div className="w-full h-full bg-black flex items-center justify-center text-white">
                Could not load stream for this episode.
            </div>
        );
    }

    return <PlayerHLS src={streamInfo.url} />;
}
