import { getSeriesDetails } from "@/lib/api";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { groupEpisodesBySeason } from "@/lib/utils"; // This util needs to be created
import Link from "next/link";

export default async function SeriesDetailsPage({ params }: { params: { id: string } }) {
  const series = await getSeriesDetails(params.id).catch(() => notFound());

  if (!series) {
    notFound();
  }

  const seasons = groupEpisodesBySeason(series.episodes || []);
  const firstEpisode = seasons[1]?.[0];

  // Redirect to the first episode of the first season
  if (firstEpisode) {
    redirect(`/series/${params.id}/season/1/episode/${firstEpisode.episode}`);
  }

  // Fallback if there are no episodes
  return (
    <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold">{series.title}</h1>
        <p className="text-muted-foreground mt-4">This series has no episodes available.</p>
    </div>
  );
}
