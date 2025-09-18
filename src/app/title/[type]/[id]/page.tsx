"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TitlePage() {
  const { type, id } = useParams<{type:string,id:string}>();
  const [data, setData] = useState<any>(null);
  const [review, setReview] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/xtream/detail?type=${type}&id=${id}`);
      const d = await r.json();
      setData(d);
      const rr = await fetch(`/api/tmdb/review?type=${type}&title=${encodeURIComponent(d?.title||"")}`);
      const dd = await rr.json();
      setReview(dd?.overview || "");
    })();
  }, [type, id]);

  if (!data) return <div className="container py-8"><div className="skel h-64" /></div>;

  return (
    <div className="container py-8">
      <div className="grid md:grid-cols-3 gap-6">
        <img src={data.posterUrl} alt={data.title} className="rounded-2xl w-full object-cover max-h-[480px]" />
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold">{data.title}</h1>
          <p className="text-zinc-300 mt-2">{data.meta}</p>
          <p className="mt-4 text-zinc-200">{review}</p>
          <div className="mt-6 flex gap-3">
            <Link href={`/watch/${type}/${id}`} className="btn">Regarder</Link>
            <button className="btn bg-zinc-800 hover:bg-zinc-700">Ajouter à ma liste</button>
          </div>
          {type === "series" && data.seasons?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold mb-2">Épisodes</h2>
              <div className="space-y-2">
                {data.seasons.map((s:any) => (
                  <div key={s.season} className="card">
                    <div className="font-medium">Saison {s.season}</div>
                    <div className="grid md:grid-cols-2 gap-2 mt-2">
                      {s.episodes.map((e:any) => (
                        <Link key={e.id} href={`/watch/episode/${e.id}`} className="text-sm underline">
                          S{s.season}E{e.num} · {e.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
