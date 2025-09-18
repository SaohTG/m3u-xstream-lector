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

  // Minimal example: return structure required by UI.
  // In a real call, you would proxy to: player_api.php?username=&password=&action=get_vod_info&vod_id=...
  const base = buildXtreamBase({ host: creds.host, port: creds.port });
  // Image from Xtream server (constraint)
  const posterUrl = `${base}/images/${type}/${id}.jpg`; // heuristic; provider dependent
  return NextResponse.json({
    title: `Titre ${id}`,
    meta: "Année · Genre · Durée",
    posterUrl,
    seasons: type === "series" ? [{ season: 1, episodes: [{ id: "e1", num: 1, title: "Pilote" }] }] : []
  });
}
