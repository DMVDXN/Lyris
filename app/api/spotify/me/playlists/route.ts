// File: app/api/spotify/me/playlists/route.ts
import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await spotifyFetch(
      "https://api.spotify.com/v1/me/playlists?limit=20",
      undefined,
      true
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify playlists fetch error: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Spotify playlists route error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown Spotify playlists error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}