import { NextResponse } from "next/server";
import { getSpotifyBasicAuth } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?spotifyAuth=denied`);
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!redirectUri) {
    return NextResponse.redirect(`${origin}/?spotifyAuth=error`);
  }

  let basic: string;
  try {
    basic = getSpotifyBasicAuth();
  } catch {
    return NextResponse.redirect(`${origin}/?spotifyAuth=error`);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    console.error("Spotify token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${origin}/?spotifyAuth=error`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  const response = NextResponse.redirect(`${origin}/?spotifyAuth=success`);

  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("spotify_access_token", access_token, {
    httpOnly: true,
    secure,
    maxAge: expires_in ?? 3600,
    path: "/",
  });

  if (refresh_token) {
    response.cookies.set("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      secure,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  return response;
}
