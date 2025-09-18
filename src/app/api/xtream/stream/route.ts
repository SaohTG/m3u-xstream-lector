import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromAccess, getXtreamCreds, buildXtreamBase } from "../util";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromAccess(req);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const creds = await getXtreamCreds(userId);
  if (!creds) return NextResponse.json({ message: "Xtream non lié" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id manquant" }, { status: 400 });

  const base = buildXtreamBase({ host: creds.host, port: creds.port });
  // Xtream URLs vary by provider; common patterns:
  // VOD:   /movie/{username}/{password}/{movie_id}.{ext}
  // Series episode: /series/{username}/{password}/{episode_id}.{ext}
  // Live:  /live/{username}/{password}/{channel_id}.m3u8
  const path = type === "movie"
    ? `movie/${creds.username}/${creds.password}/${id}.m3u8`
    : type === "episode"
      ? `series/${creds.username}/${creds.password}/${id}.m3u8`
      : `live/${creds.username}/${creds.password}/${id}.m3u8`;

  return NextResponse.json({ url: `${base}/${path}` });
}
