import { getSeriesDetails } from "@/lib/api";
import { notFound } from "next/navigation";
import Image from "next/image";
import { groupEpisodesBySeason } from "@/lib/utils";
import { EpisodeList } from "./EpisodeList";

export default async function SeriesDetailsLayout({
    children,
    params,
 }: {
    children: React.ReactNode,
    params: { id: string }
}) {
  const series = await getSeriesDetails(params.id).catch(() => notFound());

  if (!series) {
    notFound();
  }

  const seasons = groupEpisodesBySeason(series.episodes || []);
  const logo = series.logo || series.cover;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Player Section */}
        <div className="flex-1 flex flex-col bg-black">
            {children}
        </div>

        {/* Series Info and Episode List */}
        <aside className="w-96 flex flex-col border-l">
            <div className="p-4 border-b flex gap-4">
                {logo && (
                    <div className="w-24 flex-shrink-0">
                        <div className="aspect-[2/3] relative rounded-md overflow-hidden">
                            <Image src={logo} alt={series.title} fill className="object-cover" />
                        </div>
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-bold">{series.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-3">{series.plot}</p>
                </div>
            </div>
            <EpisodeList seasons={seasons} seriesId={params.id} />
        </aside>
    </div>
  );
}
