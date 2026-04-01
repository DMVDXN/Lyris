import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "artists";

    if (type !== "artists" && type !== "tracks") {
      return NextResponse.json(
        { error: "type must be artists or tracks" },
        { status: 400 }
      );
    }

    const res = await spotifyFetch(
      `https://api.spotify.com/v1/me/top/${type}?limit=10&time_range=medium_term`,
      undefined,
      true
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify top-items error: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Spotify top-items route error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown Spotify top-items error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}