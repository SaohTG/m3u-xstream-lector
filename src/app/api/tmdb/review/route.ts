import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const title = searchParams.get("title");
  if (!title) return NextResponse.json({ overview: "" });
  const apiKey = process.env.TMDB_API_KEY!;

  // Very simple search + take first overview
  const endpoint = type === "series" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(title)}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    const first = (j?.results || [])[0];
    return NextResponse.json({ overview: first?.overview || "" });
  } catch {
    return NextResponse.json({ overview: "" });
  }
}
