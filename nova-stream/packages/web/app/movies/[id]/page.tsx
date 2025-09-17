import { getMovieDetails, getStreamUrl } from "@/lib/api";
import { PlayerHLS } from "@/components/PlayerHLS";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const movie = await getMovieDetails(params.id).catch(() => notFound());

  if (!movie) {
    notFound();
  }

  const streamInfo = await getStreamUrl('movie', params.id).catch(() => null);

  return (
    <div>
      <div className="relative h-[60vh] w-full">
        {streamInfo?.url ? (
            <PlayerHLS src={streamInfo.url} />
        ) : (
            <>
                {movie.logo && (
                    <Image src={movie.logo} alt={movie.title} fill className="object-cover opacity-30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </>
        )}
      </div>
      <div className="container mx-auto p-4 md:p-8 -mt-48 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                {movie.logo && <Image src={movie.logo} alt={movie.title} fill className="object-cover" />}
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight">{movie.title}</h1>
            {movie.year && <span className="text-lg text-muted-foreground">{movie.year}</span>}
            <p className="mt-4 text-lg leading-7">{movie.plot}</p>
            {/* Add more details like cast, director, rating etc. if available */}
          </div>
        </div>
      </div>
    </div>
  );
}
