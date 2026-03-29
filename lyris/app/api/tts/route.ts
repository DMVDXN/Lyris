import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { name, description, uris, isPublic } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Playlist name is required." },
        { status: 400 }
      );
    }

    const meRes = await spotifyFetch(
      "https://api.spotify.com/v1/me",
      undefined,
      true
    );

    if (!meRes.ok) {
      const text = await meRes.text();
      throw new Error(`Spotify current user fetch error: ${text}`);
    }

    const me = await meRes.json();

    const createRes = await spotifyFetch(
      `https://api.spotify.com/v1/users/${me.id}/playlists`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description ?? "",
          public: Boolean(isPublic),
        }),
      },
      true
    );

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`Spotify create playlist error: ${text}`);
    }

    const playlist = await createRes.json();

    if (Array.isArray(uris) && uris.length > 0) {
      const addRes = await spotifyFetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
        {
          method: "POST",
          body: JSON.stringify({ uris }),
        },
        true
      );

      if (!addRes.ok) {
        const text = await addRes.text();
        throw new Error(`Spotify add items error: ${text}`);
      }
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Spotify create playlist route error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown Spotify create playlist error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}