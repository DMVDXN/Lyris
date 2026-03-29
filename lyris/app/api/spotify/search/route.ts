import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

type SpotifyArtist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  external_urls?: { spotify?: string };
};

type SpotifyAlbum = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  external_urls?: { spotify?: string };
};

type SpotifyTrack = {
  id: string;
  name: string;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  album?: SpotifyAlbum;
  artists?: { name: string }[];
};

async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials in .env.local");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token error: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json(
        { error: "Query parameter q is required." },
        { status: 400 }
      );
    }

    const token = await getSpotifyAccessToken();

    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        q
      )}&type=track,artist,album&limit=6`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!spotifyRes.ok) {
      const text = await spotifyRes.text();
      throw new Error(`Spotify search error: ${text}`);
    }

    const data = await spotifyRes.json();

    const artists: SpotifyArtist[] = data.artists?.items ?? [];
    const albums: SpotifyAlbum[] = data.albums?.items ?? [];
    const tracks: SpotifyTrack[] = data.tracks?.items ?? [];

    return NextResponse.json({
      artists: artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url ?? null,
        spotifyUrl: artist.external_urls?.spotify ?? null,
      })),
      albums: albums.map((album) => ({
        id: album.id,
        name: album.name,
        image: album.images?.[0]?.url ?? null,
        spotifyUrl: album.external_urls?.spotify ?? null,
      })),
      tracks: tracks.map((track) => ({
        id: track.id,
        name: track.name,
        artistNames: track.artists?.map((a) => a.name).join(", ") ?? "",
        image: track.album?.images?.[0]?.url ?? null,
        spotifyUrl: track.external_urls?.spotify ?? null,
        previewUrl: track.preview_url,
      })),
    });
  } catch (error) {
    console.error("Spotify search route error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown Spotify error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}