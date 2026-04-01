import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GENIUS_BASE = "https://api.genius.com";

type GeniusHit = {
  result: {
    id: number;
    title: string;
    url: string;
    song_art_image_thumbnail_url: string;
    primary_artist: { name: string };
  };
};

function extractLyrics(html: string): string {
  const sections: string[] = [];
  let idx = html.indexOf('data-lyrics-container="true"');

  while (idx !== -1) {
    const openEnd = html.indexOf(">", idx);
    if (openEnd === -1) break;

    let depth = 1;
    let pos = openEnd + 1;
    let content = "";

    while (pos < html.length && depth > 0) {
      const nextOpen = html.indexOf("<div", pos);
      const nextClose = html.indexOf("</div>", pos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        content += html.slice(pos, nextOpen);
        depth++;
        pos = nextOpen + 4;
      } else {
        content += html.slice(pos, nextClose);
        depth--;
        if (depth > 0) content += "\n";
        pos = nextClose + 6;
      }
    }

    sections.push(content);
    idx = html.indexOf('data-lyrics-container="true"', pos);
  }

  return sections
    .map((s) =>
      s
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
        .trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const id = searchParams.get("id");
  const token = process.env.GENIUS_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Genius API token not configured" }, { status: 500 });
  }

  // Search songs
  if (q) {
    const res = await fetch(
      `${GENIUS_BASE}/search?q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Genius search failed" }, { status: res.status });
    }
    const data = await res.json();
    const results = (data.response.hits as GeniusHit[]).slice(0, 8).map((hit) => ({
      id: hit.result.id,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      url: hit.result.url,
      thumbnail: hit.result.song_art_image_thumbnail_url,
    }));
    return NextResponse.json({ results });
  }

  // Get lyrics for a song
  if (id) {
    const songRes = await fetch(`${GENIUS_BASE}/songs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!songRes.ok) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
    const songData = await songRes.json();
    const { title, url } = songData.response.song;
    const artist = songData.response.song.primary_artist.name;

    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      cache: "no-store",
    });
    if (!pageRes.ok) {
      return NextResponse.json({ error: "Could not fetch lyrics page" }, { status: 502 });
    }
    const html = await pageRes.text();
    const lyrics = extractLyrics(html);

    if (!lyrics) {
      return NextResponse.json({ error: "Lyrics not found for this song" }, { status: 404 });
    }

    return NextResponse.json({ title, artist, lyrics });
  }

  return NextResponse.json({ error: "Provide q or id param" }, { status: 400 });
}
